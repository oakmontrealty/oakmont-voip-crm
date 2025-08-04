const fs = require('fs');
const { parse } = require('csv-parse');

// Usage: node loadPublicSales.js <csvFile> <STATE_CODE>
const [, , filePath, state] = process.argv;

if (!filePath || !state) {
  console.error('Usage: node loadPublicSales.js <csvFile> <STATE_CODE>');
  process.exit(1);
}

let rowCount = 0;

fs.createReadStream(filePath)
  .pipe(parse({ columns: true, skip_empty_lines: true }))
  .on('data', (row) => {
    rowCount++;
  })
  .on('end', () => {
    console.log(`Imported ${rowCount} rows for ${state}`);
  })
  .on('error', (err) => {
    console.error('Error processing CSV:', err);
    process.exit(1);
  });
