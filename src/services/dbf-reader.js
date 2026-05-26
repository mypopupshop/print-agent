const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const { DBFFile } = require('dbffile');
const logger = require('../utils/logger');

const userBaseDir = app && app.isPackaged ? app.getPath('userData') : process.cwd();
const cachePath = path.join(userBaseDir, 'config', 'dbf-cache.json');

function trimStr(v) {
  return typeof v === 'string' ? v.trim() : (v == null ? '' : String(v));
}

function toNum(v) {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Read items from a dBase III file. Throws on missing path / file / parse error.
 * @param {string} filePath - Absolute path to the .DBF file
 * @returns {Promise<Array<{itemCode:string, quality:string, dimension:string, ratesdesc:string, itemrate:number, hsncode:string}>>}
 */
async function readDbfItems(filePath) {
  if (!filePath) {
    const err = new Error('DBF_PATH_NOT_CONFIGURED');
    err.code = 'DBF_PATH_NOT_CONFIGURED';
    throw err;
  }

  try {
    await fs.access(filePath);
  } catch (e) {
    const err = new Error(`DBF_NOT_FOUND: ${filePath}`);
    err.code = 'DBF_NOT_FOUND';
    throw err;
  }

  let dbf;
  try {
    dbf = await DBFFile.open(filePath);
  } catch (e) {
    logger.error(`Failed to open DBF: ${e.message}`);
    const err = new Error(`DBF_INVALID: ${e.message}`);
    err.code = 'DBF_INVALID';
    throw err;
  }

  const items = [];
  for await (const rec of dbf) {
    const itemCode = trimStr(rec.ITEMCODE);
    const quality = trimStr(rec.QUALITY);
    if (!itemCode && !quality) continue;
    items.push({
      itemCode,
      quality,
      dimension: trimStr(rec.DIMENSION),
      ratesdesc: trimStr(rec.RATESDESC),
      itemrate: toNum(rec.ITEMRATE),
      hsncode: trimStr(rec.HSNCODE)
    });
  }

  logger.info(`DBF read ${items.length} items from ${filePath}`);
  return items;
}

/**
 * Persist a successful read to the on-disk cache so it can be served if the
 * source DBF later becomes unavailable.
 */
async function saveCache(items, sourcePath) {
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    const tmp = cachePath + '.tmp';
    await fs.writeFile(
      tmp,
      JSON.stringify({ savedAt: new Date().toISOString(), sourcePath, items }),
      'utf-8'
    );
    await fs.rename(tmp, cachePath);
  } catch (e) {
    // Cache write failures should never break the live read path
    logger.warn(`Failed to write DBF cache: ${e.message}`);
  }
}

/**
 * Load the previously-cached items, if any.
 * @returns {Promise<{items, savedAt, sourcePath} | null>}
 */
async function loadCache() {
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.items)) return parsed;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Read items with cache fallback: try live read, write the cache on success;
 * on any error, return the last cached items if available.
 * @param {string} filePath
 * @returns {Promise<{items, source:'live'|'cache', savedAt?:string, sourcePath?:string, error?:{code,message}}>}
 */
async function getItemsWithFallback(filePath) {
  try {
    const items = await readDbfItems(filePath);
    await saveCache(items, filePath);
    return { items, source: 'live' };
  } catch (liveErr) {
    const cached = await loadCache();
    if (cached) {
      logger.warn(
        `Live DBF read failed (${liveErr.code || 'UNKNOWN'}); serving ${cached.items.length} items from cache (saved ${cached.savedAt})`
      );
      return {
        items: cached.items,
        source: 'cache',
        savedAt: cached.savedAt,
        sourcePath: cached.sourcePath,
        error: { code: liveErr.code || 'UNKNOWN', message: liveErr.message }
      };
    }
    throw liveErr;
  }
}

module.exports = { readDbfItems, getItemsWithFallback, loadCache, saveCache };
