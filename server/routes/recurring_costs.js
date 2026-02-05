const express = require('express');
const router = express.Router({ mergeParams: true });
const { getHouseholdDb, ensureHouseholdSchema } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/crypto');

/**
 * Middleware to Attach Tenant DB
 */
const useTenantDb = async (req, res, next) => {
    const hhId = req.params.id;
    if (!hhId) return res.status(400).json({ error: "Household ID required" });
    try {
        const db = getHouseholdDb(hhId);
        await ensureHouseholdSchema(db, hhId);
        req.tenantDb = db;
        req.hhId = hhId;
        next();
    } catch (err) {
        res.status(500).json({ error: "Database initialization failed: " + err.message });
    }
};

const closeDb = (req) => {
    if (req.tenantDb) req.tenantDb.close();
};

// SENSITIVE FIELDS IN METADATA
const SENSITIVE_FIELDS = ['account_number', 'policy_number', 'sort_code', 'registration', 'serial_number', 'wifi_password'];

const processMetadata = (metadata, isEncrypt = true) => {
    if (!metadata) return null;
    let data = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    Object.keys(data).forEach(key => {
        if (SENSITIVE_FIELDS.includes(key) && data[key]) {
            try {
                data[key] = isEncrypt ? encrypt(String(data[key])) : decrypt(String(data[key]));
            } catch (e) {
                // Keep original if decryption fails
            }
        }
    });
    return JSON.stringify(data);
};

const decryptMetadata = (row) => {
    if (!row || !row.metadata) return row;
    const decrypted = { ...row };
    decrypted.metadata = JSON.parse(processMetadata(row.metadata, false));
    return decrypted;
};

// GET /households/:id/recurring-costs
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    let sql = `SELECT * FROM recurring_costs WHERE household_id = ? AND is_active = 1`;
    const params = [req.hhId];

    if (req.query.object_type) {
        sql += ` AND object_type = ?`;
        params.push(req.query.object_type);
    }
    if (req.query.object_id) {
        sql += ` AND object_id = ?`;
        params.push(req.query.object_id);
    }
    if (req.query.category_id) {
        sql += ` AND category_id = ?`;
        params.push(req.query.category_id);
    }

    req.tenantDb.all(sql, params, (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json((rows || []).map(decryptMetadata));
    });
});

// POST /households/:id/recurring-costs
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        object_type, object_id, category_id, name, amount, frequency, 
        start_date, day_of_month, month_of_year, day_of_week,
        adjust_for_working_day, bank_account_id, financial_profile_id, emoji, notes, metadata 
    } = req.body;

    const sql = `INSERT INTO recurring_costs (
        household_id, object_type, object_id, category_id, name, amount, frequency, 
        start_date, day_of_month, month_of_year, day_of_week,
        adjust_for_working_day, bank_account_id, financial_profile_id, emoji, notes, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const processedMetadata = processMetadata(metadata, true);

    const params = [
        req.hhId, object_type || 'household', object_id || null, category_id, name, amount, frequency || 'monthly', 
        start_date || null, day_of_month || null, month_of_year || null, day_of_week || null,
        adjust_for_working_day !== undefined ? adjust_for_working_day : 1, 
        bank_account_id || null, financial_profile_id || null,
        emoji || null, notes || null, processedMetadata
    ];

    req.tenantDb.run(sql, params, function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT /households/:id/recurring-costs/:itemId
router.put('/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        object_type, object_id, category_id, name, amount, frequency, 
        start_date, day_of_month, month_of_year, day_of_week,
        adjust_for_working_day, bank_account_id, financial_profile_id, emoji, notes, metadata, is_active 
    } = req.body;

    const sql = `UPDATE recurring_costs SET 
        object_type = ?, object_id = ?, category_id = ?, name = ?, amount = ?, frequency = ?, 
        start_date = ?, day_of_month = ?, month_of_year = ?, day_of_week = ?,
        adjust_for_working_day = ?, bank_account_id = ?, financial_profile_id = ?, emoji = ?, notes = ?, metadata = ?, is_active = ?
        WHERE id = ? AND household_id = ?`;

    const processedMetadata = processMetadata(metadata, true);

    const params = [
        object_type, object_id, category_id, name, amount, frequency, 
        start_date, day_of_month, month_of_year, day_of_week,
        adjust_for_working_day, bank_account_id, financial_profile_id, emoji, notes, processedMetadata, is_active !== undefined ? is_active : 1,
        req.params.itemId, req.hhId
    ];

    req.tenantDb.run(sql, params, function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Item not found" });
        res.json({ message: "Updated" });
    });
});

// DELETE /households/:id/recurring-costs/:itemId
router.delete('/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    // We archive instead of hard delete to preserve budget history
    req.tenantDb.run(`UPDATE recurring_costs SET is_active = 0 WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Archived" });
    });
});

module.exports = router;