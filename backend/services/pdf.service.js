const pdfParse = require('pdf-parse');
const fs = require('fs');

async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

module.exports = { extractText };
