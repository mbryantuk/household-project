const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

const { encrypt, decrypt } = require('../services/crypto');

/**
 * Multi-Tenancy Enforcement:
 */

const useTenantDb = (req, res, next) => {
    const hhId = req.params.id;
    if (!hhId) return res.status(400).json({ error: "Household ID required" });
    const db = getHouseholdDb(hhId);
    req.tenantDb = db;
    req.hhId = hhId;
    next();
};

const closeDb = (req) => {
    if (req.tenantDb) req.tenantDb.close();
};

// SENSITIVE FIELDS MAP
const SENSITIVE_FIELDS = ['registration', 'policy_number', 'account_number', 'sort_code', 'serial_number', 'account_number', 'wifi_password'];

const encryptPayload = (data) => {
    const encrypted = { ...data };
    Object.keys(encrypted).forEach(key => {
        if (SENSITIVE_FIELDS.includes(key) && encrypted[key]) {
            encrypted[key] = encrypt(String(encrypted[key]));
        }
    });
    return encrypted;
};

const decryptRow = (row) => {
    if (!row) return row;
    const decrypted = { ...row };
    Object.keys(decrypted).forEach(key => {
        if (SENSITIVE_FIELDS.includes(key) && decrypted[key]) {
            try {
                decrypted[key] = decrypt(decrypted[key]);
            } catch (e) {
                // Return original if not encrypted
            }
        }
    });
    return decrypted;
};

// ==========================================
// 🏠 GENERIC CRUD HELPERS (Tenant-Aware)
// ==========================================

const handleGetSingle = (table) => (req, res) => {
    req.tenantDb.get(`SELECT * FROM ${table} WHERE household_id = ?`, [req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(decryptRow(row) || {});
    });
};

const handleUpdateSingle = (table) => (req, res) => {
    req.tenantDb.all(`PRAGMA table_info(${table})`, [], (pErr, cols) => {
        if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
        
        const validColumns = cols.map(c => c.name);
        const data = encryptPayload({ ...req.body, household_id: req.hhId });
        
        const updateData = {};
        Object.keys(data).forEach(key => {
            if (validColumns.includes(key) && key !== 'id') {
                updateData[key] = data[key];
            }
        });

        const fields = Object.keys(updateData);
        if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No valid fields to update" }); }

        const sets = fields.map(f => `${f} = ?`).join(', ');
        const values = Object.values(updateData);

        req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE household_id = ?`, [...values, req.hhId], function(err) {
            if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
            if (this.changes === 0) {
                const placeholders = fields.join(', ');
                const qs = fields.map(() => '?').join(', ');
                req.tenantDb.run(`INSERT INTO ${table} (${placeholders}) VALUES (${qs})`, values, (iErr) => {
                    closeDb(req);
                    if (iErr) return res.status(500).json({ error: iErr.message });
                    res.json({ message: "Created" });
                });
            } else {
                closeDb(req);
                res.json({ message: "Updated" });
            }
        });
    });
};

const handleGetList = (table) => (req, res) => {
    req.tenantDb.all(`SELECT * FROM ${table} WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json((rows || []).map(decryptRow));
    });
};

const handleGetItem = (table) => (req, res) => {
    req.tenantDb.get(`SELECT * FROM ${table} WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Item not found" });
        res.json(decryptRow(row));
    });
};

const handleCreateItem = (table) => (req, res) => {
    req.tenantDb.all(`PRAGMA table_info(${table})`, [], (pErr, cols) => {
        if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
        
        const validColumns = cols.map(c => c.name);
        const data = encryptPayload({ ...req.body, household_id: req.hhId });
        
        const insertData = {};
        Object.keys(data).forEach(key => {
            if (validColumns.includes(key)) {
                insertData[key] = data[key];
            }
        });

        const fields = Object.keys(insertData);
        if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No valid fields" }); }
        
        const placeholders = fields.join(', ');
        const qs = fields.map(() => '?').join(', ');
        const values = Object.values(insertData);

        req.tenantDb.run(`INSERT INTO ${table} (${placeholders}) VALUES (${qs})`, values, function(err) {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, ...insertData });
        });
    });
};

const handleUpdateItem = (table) => (req, res) => {
    req.tenantDb.all(`PRAGMA table_info(${table})`, [], (pErr, cols) => {
        if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
        
        const validColumns = cols.map(c => c.name);
        const data = encryptPayload(req.body);
        
        const updateData = {};
        Object.keys(data).forEach(key => {
            if (validColumns.includes(key) && key !== 'id' && key !== 'household_id') {
                updateData[key] = data[key];
            }
        });

        const fields = Object.keys(updateData);
        if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No valid fields" }); }

        const sets = fields.map(f => `${f} = ?`).join(', ');
        const values = Object.values(updateData);

        req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE id = ? AND household_id = ?`, [...values, req.params.itemId, req.hhId], function(err) {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated" });
        });
    });
};

const handleDeleteItem = (table) => (req, res) => {
    req.tenantDb.run(`DELETE FROM ${table} WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
    });
};

// ==========================================
// 🚀 ROUTES
// ==========================================

// House Details
router.get('/households/:id/details', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetSingle('house_details'));
router.put('/households/:id/details', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateSingle('house_details'));

// Water Accounts
router.get('/households/:id/water', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('water_accounts'));
router.get('/households/:id/water/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('water_accounts'));
router.post('/households/:id/water', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('water_accounts'));
router.put('/households/:id/water/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('water_accounts'));
router.delete('/households/:id/water/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('water_accounts'));

// Council Accounts
router.get('/households/:id/council', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('council_accounts'));
router.get('/households/:id/council/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('council_accounts'));
router.post('/households/:id/council', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('council_accounts'));
router.put('/households/:id/council/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('council_accounts'));
router.delete('/households/:id/council/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('council_accounts'));

// Waste Collections
router.get('/households/:id/waste', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('waste_collections'));
router.get('/households/:id/waste/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('waste_collections'));
router.post('/households/:id/waste', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('waste_collections'));
router.put('/households/:id/waste/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('waste_collections'));
router.delete('/households/:id/waste/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('waste_collections'));

// Vehicles
router.get('/households/:id/vehicles', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('vehicles'));
router.get('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('vehicles'));
router.post('/households/:id/vehicles', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('vehicles'));
router.put('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('vehicles'));
router.delete('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('vehicles'));

// Vehicle Sub-modules
const VEHICLE_SUBS = ['services', 'finance', 'insurance', 'service_plans'];
VEHICLE_SUBS.forEach(sub => {
    const table = `vehicle_${sub}`;
    router.get(`/households/:id/vehicles/:vehicleId/${sub}`, authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
        req.tenantDb.all(`SELECT * FROM ${table} WHERE vehicle_id = ? AND household_id = ?`, [req.params.vehicleId, req.hhId], (err, rows) => {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json((rows || []).map(decryptRow));
        });
    });
    router.post(`/households/:id/vehicles/:vehicleId/${sub}`, authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
        req.tenantDb.all(`PRAGMA table_info(${table})`, [], (pErr, cols) => {
            if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
            const validColumns = cols.map(c => c.name);
            const data = encryptPayload({ ...req.body, vehicle_id: req.params.vehicleId, household_id: req.hhId });
            const insertData = {};
            Object.keys(data).forEach(key => {
                if (validColumns.includes(key)) insertData[key] = data[key];
            });
            const fields = Object.keys(insertData);
            req.tenantDb.run(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, Object.values(insertData), function(err) {
                closeDb(req);
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, ...insertData });
            });
        });
    });
    router.put(`/households/:id/vehicles/:vehicleId/${sub}/:itemId`, authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
        req.tenantDb.all(`PRAGMA table_info(${table})`, [], (pErr, cols) => {
            if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
            const validColumns = cols.map(c => c.name);
            const data = encryptPayload(req.body);
            const updateData = {};
            Object.keys(data).forEach(key => {
                if (validColumns.includes(key) && key !== 'id' && key !== 'household_id' && key !== 'vehicle_id') {
                    updateData[key] = data[key];
                }
            });
            const fields = Object.keys(updateData);
            if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No valid fields" }); }
            const sets = fields.map(f => `${f} = ?`).join(', ');
            req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE id = ? AND vehicle_id = ? AND household_id = ?`, [...Object.values(updateData), req.params.itemId, req.params.vehicleId, req.hhId], function(err) {
                closeDb(req);
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Updated" });
            });
        });
    });
    router.delete(`/households/:id/vehicles/:vehicleId/${sub}/:itemId`, authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
        req.tenantDb.run(`DELETE FROM ${table} WHERE id = ? AND vehicle_id = ? AND household_id = ?`, [req.params.itemId, req.params.vehicleId, req.hhId], function(err) {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
        });
    });
});

// Assets
router.get('/households/:id/assets', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('assets'));
router.get('/households/:id/assets/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('assets'));
router.post('/households/:id/assets', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('assets'));
router.put('/households/:id/assets/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('assets'));
router.delete('/households/:id/assets/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('assets'));

// Energy Accounts
router.get('/households/:id/energy', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('energy_accounts'));
router.get('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('energy_accounts'));
router.post('/households/:id/energy', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('energy_accounts'));
router.put('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('energy_accounts'));
router.delete('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('energy_accounts'));

module.exports = router;