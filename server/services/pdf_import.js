const pdf = require('pdf-parse');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Item 274: PDF Statement Scraping
 * Extracts transaction data from bank PDF statements.
 */
async function extractTransactionsFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    const text = data.text;
    const lines = text.split('\n');

    const transactions = [];

    // Common date patterns: DD/MM/YYYY, DD MMM YYYY, YYYY-MM-DD
    // eslint-disable-next-line no-useless-escape
    const dateRegex =
      /(\d{1,2}[\/\-\s](?:\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-\s]\d{2,4})/i;
    // Amount pattern: £?1,234.56 or -1234.56
    const amountRegex = /([-£]?\d{1,3}(?:,\d{3})*(?:\.\d{2}))/;

    lines.forEach((line) => {
      const dateMatch = line.match(dateRegex);
      const amountMatch = line.match(amountRegex);

      if (dateMatch && amountMatch) {
        // Extract description: everything between date and amount
        let description = line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim();

        // Cleanup description (remove multiple spaces, common junk)
        description = description.replace(/\s\s+/g, ' ');

        if (description.length > 2) {
          transactions.push({
            date: dateMatch[0],
            description,
            amount: parseFloat(amountMatch[0].replace(/[£,]/g, '')),
            raw: line,
          });
        }
      }
    });

    logger.info(`[PDF-IMPORT] Extracted ${transactions.length} potential transactions from PDF.`);
    return transactions;
  } catch (err) {
    logger.error('[PDF-IMPORT] Failed to parse PDF:', err.message);
    throw new Error('Failed to parse PDF statement.');
  }
}

module.exports = { extractTransactionsFromPdf };
