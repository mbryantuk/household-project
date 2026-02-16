const express = require('express');
const router = express.Router({ mergeParams: true });
const { dbAll } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');

const upload = multer({ dest: '/tmp/' });

const normalizeDescription = (desc) => {
    if (!desc) return '';
    // Remove dates, reference numbers, etc. to find common patterns
    return desc.replace(/\d+/g, '').replace(/\s\s+/g, ' ').trim().toUpperCase();
};

router.post('/analyze-statement', authenticateToken, requireHouseholdRole('member'), useTenantDb, upload.single('statement'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const results = [];
    const parser = fs.createReadStream(req.file.path).pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
    }));

    try {
        for await (const record of parser) {
            results.push(record);
        }
    } catch (err) {
        return res.status(400).json({ error: "Failed to parse CSV: " + err.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }

    // Try to find columns for Date, Description, and Amount
    const sample = results[0];
    if (!sample) {
        return res.status(400).json({ error: "CSV is empty" });
    }

    const keys = Object.keys(sample);
    const dateKey = keys.find(k => k.toLowerCase().includes('date'));
    const descKey = keys.find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('memo') || k.toLowerCase().includes('transaction'));
    const amountKey = keys.find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('value') || k.toLowerCase().includes('subtotal'));
    const creditKey = keys.find(k => k.toLowerCase().includes('credit'));
    const debitKey = keys.find(k => k.toLowerCase().includes('debit'));

    if (!dateKey || !descKey || (!amountKey && (!creditKey || !debitKey))) {
        return res.status(400).json({ error: "Could not identify Date, Description, and Amount columns", columns: keys });
    }

    const transactions = results.map(r => {
        let amount = 0;
        if (amountKey) {
            amount = parseFloat(r[amountKey].replace(/[^0-9.-]+/g, ""));
        } else {
            const credit = parseFloat(r[creditKey]?.replace(/[^0-9.-]+/g, "") || 0);
            const debit = parseFloat(r[debitKey]?.replace(/[^0-9.-]+/g, "") || 0);
            amount = credit !== 0 ? credit : -debit;
        }

        return {
            date: r[dateKey],
            description: r[descKey],
            amount: amount,
            normalized: normalizeDescription(r[descKey])
        };
    });

    // Analyze for recurring patterns
    const groups = {};
    transactions.forEach(t => {
        if (!groups[t.normalized]) groups[t.normalized] = [];
        groups[t.normalized].push(t);
    });

    const suggestions = [];
    
    // Fetch existing recurring costs to avoid duplicates and help with mapping
    const existingCosts = await new Promise((resolve) => {
        req.tenantDb.all("SELECT * FROM recurring_costs WHERE household_id = ? AND is_active = 1", [req.hhId], (err, rows) => resolve(rows || []));
    });

    const members = await new Promise((resolve) => {
        req.tenantDb.all("SELECT * FROM members WHERE household_id = ?", [req.hhId], (err, rows) => resolve(rows || []));
    });

    const vehicles = await new Promise((resolve) => {
        req.tenantDb.all("SELECT * FROM vehicles WHERE household_id = ?", [req.hhId], (err, rows) => resolve(rows || []));
    });

    const categories = await new Promise((resolve) => {
        req.tenantDb.all("SELECT * FROM finance_budget_categories WHERE household_id = ?", [req.hhId], (err, rows) => resolve(rows || []));
    });

    for (const [norm, txs] of Object.entries(groups)) {
        // If it appears multiple times, it's likely recurring
        // Or if it's a known category (e.g. Netflix, Rent, Mortgage)
        const isRecurring = txs.length >= 2; 
        
        const avgAmount = txs.reduce((sum, t) => sum + t.amount, 0) / txs.length;
        const lastTx = txs[txs.length - 1];

        // Try to identify member
        let memberId = null;
        for (const m of members) {
            const mName = m.name.toUpperCase();
            const mFirstName = m.first_name?.toUpperCase();
            if (lastTx.description.toUpperCase().includes(mName) || (mFirstName && lastTx.description.toUpperCase().includes(mFirstName))) {
                memberId = m.id;
                break;
            }
        }

        // Check against existing
        const existing = existingCosts.find(ec => normalizeDescription(ec.name) === norm || lastTx.description.toUpperCase().includes(ec.name.toUpperCase()));

        suggestions.push({
            name: lastTx.description,
            normalized: norm,
            amount: Math.abs(avgAmount),
            is_income: avgAmount > 0,
            frequency: 'monthly', // Default assumption
            count: txs.length,
            last_date: lastTx.date,
            is_recurring: isRecurring,
            member_id: memberId,
            existing_id: existing?.id || null,
            already_exists: !!existing
        });
    }

    res.json({
        suggestions: suggestions.filter(s => s.is_recurring || s.already_exists || s.amount > 50).sort((a, b) => b.count - a.count),
        vehicles,
        categories
    });
});

module.exports = router;
