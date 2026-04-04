const logger = require('../../utils/logger');

const ESC = 0x1B;
const GS = 0x1D;

/**
 * Download an image from URL and return a Buffer
 */
async function fetchImage(url) {
  const { net } = require('electron');
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    const chunks = [];
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Image fetch failed: ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.end();
  });
}

/**
 * Convert image buffer to ESC/POS raster bit-image bytes (GS v 0).
 * Uses sharp to resize & convert to 1-bit monochrome.
 *
 * @param {Buffer} imgBuffer - Raw image data (PNG, JPEG, etc.)
 * @param {number} maxWidth - Max pixel width (default 384 for 80mm paper at 203dpi)
 * @returns {Buffer} ESC/POS bytes ready to send to printer
 */
async function imageToEscpos(imgBuffer, maxWidth = 384) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    logger.warn('sharp not installed — skipping image print');
    return null;
  }

  // Get image metadata to calculate resize
  const metadata = await sharp(imgBuffer).metadata();
  const width = Math.min(metadata.width || maxWidth, maxWidth);
  // Width must be divisible by 8 for raster format
  const alignedWidth = Math.floor(width / 8) * 8;

  // Resize, convert to grayscale, then to raw pixels
  const { data, info } = await sharp(imgBuffer)
    .resize(alignedWidth, null, { fit: 'inside', withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelWidth = info.width;
  const pixelHeight = info.height;
  const byteWidth = Math.ceil(pixelWidth / 8);

  // Convert grayscale pixels to 1-bit monochrome (threshold 128)
  // ESC/POS: 1 = black dot, 0 = white dot
  const bitmapBytes = [];
  for (let y = 0; y < pixelHeight; y++) {
    for (let bx = 0; bx < byteWidth; bx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = bx * 8 + bit;
        if (x < pixelWidth) {
          const pixel = data[y * pixelWidth + x];
          // Dark pixel → set bit (print dot)
          if (pixel < 128) {
            byte |= (0x80 >> bit);
          }
        }
      }
      bitmapBytes.push(byte);
    }
  }

  // Build GS v 0 command: GS v 0 m xL xH yL yH [data]
  // m = 0 (normal density)
  const xL = byteWidth & 0xFF;
  const xH = (byteWidth >> 8) & 0xFF;
  const yL = pixelHeight & 0xFF;
  const yH = (pixelHeight >> 8) & 0xFF;

  const header = Buffer.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  return Buffer.concat([header, Buffer.from(bitmapBytes)]);
}

/**
 * Download image from URL and convert to ESC/POS raster bytes.
 * Returns null on any failure (caller should skip image gracefully).
 */
async function urlToEscposImage(url, maxWidth = 384) {
  if (!url) return null;
  try {
    const imgBuffer = await fetchImage(url);
    return await imageToEscpos(imgBuffer, maxWidth);
  } catch (err) {
    logger.warn(`Failed to process image ${url}: ${err.message}`);
    return null;
  }
}

module.exports = { imageToEscpos, urlToEscposImage, fetchImage };
