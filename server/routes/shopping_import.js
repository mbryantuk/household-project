const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');

const upload = multer({ dest: '/tmp/' });

/**
 * POST /households/:id/shopping-list/analyze-receipt
 * Supports Images (OCR), PDFs, and Email Text
 */
router.post('/analyze-receipt', authenticateToken, requireHouseholdRole('member'), useTenantDb, upload.single('receipt'), async (req, res) => {
    let text = '';
    const filePath = req.file?.path;

    try {
        if (req.body.text) {
            text = req.body.text;
        } else if (req.file) {
            const mimeType = req.file.mimetype;
            if (mimeType.includes('image')) {
                const { data: { text: ocrText } } = await Tesseract.recognize(filePath, 'eng');
                text = ocrText;
            } else if (mimeType.includes('pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                text = pdfData.text;
            } else {
                text = fs.readFileSync(filePath, 'utf8');
            }
        }

        if (!text) {
            return res.status(400).json({ error: "No content found to analyze" });
        }

        // Logic to extract items and prices
        // Looking for lines like "Item Name ... 1.23" or similar
        const lines = text.split('\n');
        const items = [];
        
        // Regex for simple price detection at end of line (supports Ocado £ 2.00 format)
        const priceRegex = /(?:£\s*)?([\d]+\.[\d]{2})\s*$/;
        
        // Regex for quantity patterns
        const qtyPrefixRegex = /^(\d+)\s*[xX]?\s+/; // "2 x Item" or "2 Item"
        const qtySuffixRegex = /\s+(\d+)\s*[xX]?\s+/; // "Item 2 x"
        const atQtyRegex = /\s+(\d+)\s*@\s*/; // "Item 2 @ 1.50"
        const weightRegex = /(\d+\.?\d*)\s*(kg|g|lb|oz|l|ml)/i; // "Bananas 0.5kg"

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.length < 3) return;
            
            // Skip common receipt header/footer terms
            const skipTerms = ['TOTAL', 'SUBTOTAL', 'TAX', 'VAT', 'CASH', 'CHANGE', 'DATE', 'THANK', 'STORE', 'ADDRESS', 'SAVED', 'BALANCE', 'PRICE TO PAY', 'QUANTITY', 'PRODUCT'];
            if (skipTerms.some(term => trimmed.toUpperCase().includes(term))) return;

            let quantity = '1';
            let processedLine = trimmed;

            // Handle Ocado specific "Name [TAB] Qty [TAB] Price" or similar
            // Example: "Biomel Belgian Chocolate Gut Health Shot	2	£ 2.00"
            const tabs = processedLine.split('\t');
            if (tabs.length >= 3) {
                const name = tabs[0].trim();
                const qty = tabs[1].trim();
                const priceStr = tabs[2].trim().replace(/[^\d.]/g, '');
                const price = parseFloat(priceStr);
                if (name && !isNaN(price)) {
                    items.push({ name, estimated_cost: price, quantity: qty, category: 'general' });
                    return;
                }
            }

            // 1. Try to extract quantity from start (2 x Milk)
            const prefixMatch = processedLine.match(qtyPrefixRegex);
            if (prefixMatch) {
                quantity = prefixMatch[1];
                processedLine = processedLine.replace(qtyPrefixRegex, '');
            }

            // 2. Try to extract quantity from middle (Milk 2 x 1.20)
            const suffixMatch = processedLine.match(qtySuffixRegex);
            if (suffixMatch) {
                quantity = suffixMatch[1];
                processedLine = processedLine.replace(qtySuffixRegex, ' ');
            }

            // 3. Try to extract @ quantity (Milk 2 @ 1.20)
            const atMatch = processedLine.match(atQtyRegex);
            if (atMatch) {
                quantity = atMatch[1];
                processedLine = processedLine.replace(atQtyRegex, ' ');
            }

            // 4. Try weight detection (Bananas 0.5kg)
            const weightMatch = processedLine.match(weightRegex);
            if (weightMatch) {
                quantity = weightMatch[0]; // Keep "0.5kg" as the quantity string
            }

            const match = processedLine.match(priceRegex);
            if (match) {
                const price = parseFloat(match[1]);
                const name = processedLine.replace(match[0], '').trim().replace(/^[^\w]+/, ''); // Clean non-word starts
                if (name.length > 2) {
                    items.push({ name, estimated_cost: price, quantity, category: 'general' });
                }
            } else if (processedLine.length > 5 && !processedLine.includes(':') && !processedLine.match(/^\d+$/)) {
                // Potential item without price
                items.push({ name: processedLine.trim(), estimated_cost: 0, quantity, category: 'general' });
            }
        });

        res.json({ 
            items: items.slice(0, 100), // Cap at 100 items
            raw_text_preview: text.substring(0, 500) 
        });

    } catch (err) {
        console.error("[RECEIPT-ANALYSIS] Error:", err);
        res.status(500).json({ error: "Failed to analyze receipt: " + err.message });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

module.exports = router;
