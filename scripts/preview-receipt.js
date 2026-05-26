#!/usr/bin/env node
/**
 * Offline receipt preview: runs a structured-receipt payload through the same
 * Joi validation the API uses, then the formatter, then decodes the ESC/POS
 * byte stream into a readable approximation of what the printer emits.
 *
 * Usage: node scripts/preview-receipt.js [path-to-payload.json]
 *        (defaults to ../test-gst-receipt.json)
 */
const path = require('path');
const fs = require('fs');
const Joi = require('joi');

// Reuse the real validation by extracting the receipt schema indirectly: we
// validate via a tiny re-implementation that defers to the shared middleware.
const { validate } = require('../src/api/middleware/validator');
const { formatReceipt } = require('../src/services/templates/receipt-formatter');

const ESC = 0x1b;
const GS = 0x1d;

function decode(buffer) {
  const lines = [];
  let line = '';
  let i = 0;
  const flush = () => { lines.push(line); line = ''; };
  while (i < buffer.length) {
    const b = buffer[i];
    if (b === ESC && buffer[i + 1] === 0x40) { i += 2; continue; } // init
    if (b === ESC && buffer[i + 1] === 0x45) { i += 3; continue; } // bold
    if (b === ESC && buffer[i + 1] === 0x61) { i += 3; continue; } // align
    if (b === GS && buffer[i + 1] === 0x21) { i += 3; continue; }  // size
    if (b === GS && buffer[i + 1] === 0x42) { i += 3; continue; }  // reverse
    if (b === GS && buffer[i + 1] === 0x56) { i += 3; continue; }  // cut
    if (b === GS && buffer[i + 1] === 0x28 && buffer[i + 2] === 0x6b) {
      // QR block: GS ( k pL pH ...
      const pL = buffer[i + 3];
      const pH = buffer[i + 4];
      i += 5 + (pL + pH * 256);
      if (!line.includes('[QR')) line += '[QR CODE]';
      continue;
    }
    if (b === 0x0a) { flush(); i += 1; continue; }
    // printable byte
    line += Buffer.from([b]).toString('utf-8');
    i += 1;
  }
  if (line) flush();
  return lines;
}

async function main() {
  const file = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '..', 'test-gst-receipt.json');
  const body = JSON.parse(fs.readFileSync(file, 'utf-8'));

  // Run the exact middleware to mirror the API's strip/validate behaviour.
  const validated = await new Promise((resolve, reject) => {
    const req = { body };
    const res = {
      status: () => res,
      json: (payload) => reject(new Error('Validation failed: ' + JSON.stringify(payload))),
    };
    validate('receipt')(req, res, () => resolve(req.body));
  });

  const buffer = await formatReceipt(validated.data);
  const lines = decode(buffer);

  const W = validated.data.paperWidth || 48;
  console.log('+' + '='.repeat(W) + '+');
  lines.forEach((l) => console.log('|' + l.padEnd(W).slice(0, W) + '|'));
  console.log('+' + '='.repeat(W) + '+');
  console.log(`\n${buffer.length} bytes · ${lines.length} lines · ${W} cols`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
