const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');

/**
 * Item 294: Receipt OCR Service
 * Uses Tesseract.js to extract text from receipt images.
 */
async function extractReceiptData(imageBuffer) {
  try {
    logger.info('[OCR] Starting receipt extraction...');

    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: (m) => logger.debug(`[TESSERACT] ${m.status}: ${Math.round(m.progress * 100)}%`),
    });

    const lines = text.split('\n');
    const items = [];

    // Simple regex for currency amounts (e.g. 12.99)
    const amountRegex = /(\d+\.\d{2})/;

    lines.forEach((line) => {
      const match = line.match(amountRegex);
      if (match) {
        // Assume description is everything before the amount
        const description = line.replace(match[0], '').trim();
        if (description.length > 2) {
          items.push({
            description,
            amount: parseFloat(match[0]),
          });
        }
      }
    });

    // Try to find total
    const totalLine = lines.find((l) => l.toUpperCase().includes('TOTAL'));
    let total = 0;
    if (totalLine) {
      const totalMatch = totalLine.match(amountRegex);
      if (totalMatch) total = parseFloat(totalMatch[0]);
    }

    logger.info(`[OCR] Extracted ${items.length} items from receipt.`);
    return { items, total, rawText: text };
  } catch (err) {
    logger.error('[OCR] Failed to process image:', err.message);
    throw new Error('OCR Engine failed to process image.');
  }
}

module.exports = { extractReceiptData };
