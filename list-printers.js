// List all Windows printers
// Run with: node list-printers.js

try {
  const printer = require('node-printer');

  console.log('=== Installed Windows Printers ===\n');

  // Try different API methods
  if (printer.getPrinters) {
    const printers = printer.getPrinters();
    printers.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      if (p.status) console.log(`   Status: ${p.status}`);
      if (p.isDefault) console.log(`   (Default Printer)`);
      console.log();
    });
  } else if (printer.list) {
    const printers = printer.list();
    console.log(printers);
  } else {
    console.log('Available methods:', Object.keys(printer));
  }

} catch (error) {
  console.error('Error:', error.message);
  console.log('\nNote: node-printer requires native modules.');
  console.log('Run: npm install');
}
