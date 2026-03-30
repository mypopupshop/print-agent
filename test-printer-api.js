// Test node-printer API
const printer = require('node-printer');

console.log('=== node-printer API ===');
console.log('Available methods:', Object.keys(printer));
console.log('\nTrying to get printers...\n');

// Try different methods
if (typeof printer.getPrinters === 'function') {
  console.log('getPrinters():', printer.getPrinters());
}

if (typeof printer.list === 'function') {
  console.log('list():', printer.list());
}

if (typeof printer.getDefaultPrinterName === 'function') {
  console.log('getDefaultPrinterName():', printer.getDefaultPrinterName());
}

console.log('\nFull printer object:', printer);
