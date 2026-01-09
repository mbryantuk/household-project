const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// Middleware to standardize DB initialization
const useTenantDb = (req, res, next) => {
    const db = getHouseholdDb(req.params.id);
    req.tenantDb = db;
    next();
};

const closeDb = (req) => {
    if (req.tenantDb) req.tenantDb.close();
};

// ==========================================
// 🏠 GENERIC CRUD HELPERS
// ==========================================

const handleGetSingle = (table) => (req, res) => {
    req.tenantDb.get(`SELECT * FROM ${table} WHERE id = 1`, [], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
};

const handleUpdateSingle = (table) => (req, res) => {
    const fields = Object.keys(req.body);
    if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No fields to update" }); }

    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = Object.values(req.body);

    // Try to update, if not exists, insert (since these are id=1 singleton tables)
    req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE id = 1`, values, function(err) {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        
        if (this.changes === 0) {
            // Insert initial row
            const placeholders = fields.join(', ');
            const qs = fields.map(() => '?').join(', ');
            req.tenantDb.run(`INSERT INTO ${table} (id, ${placeholders}) VALUES (1, ${qs})`, values, (iErr) => {
                closeDb(req);
                if (iErr) return res.status(500).json({ error: iErr.message });
                res.json({ message: "Created and updated" });
            });
        } else {
            closeDb(req);
            res.json({ message: "Updated" });
        }
    });
};

const handleGetList = (table) => (req, res) => {
    req.tenantDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

const handleCreateItem = (table) => (req, res) => {
    const fields = Object.keys(req.body);
    const placeholders = fields.join(', ');
    const qs = fields.map(() => '?').join(', ');
    const values = Object.values(req.body);

    req.tenantDb.run(`INSERT INTO ${table} (${placeholders}) VALUES (${qs})`, values, function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body });
    });
};

const handleUpdateItem = (table) => (req, res) => {
    const fields = Object.keys(req.body);
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = [...Object.values(req.body), req.params.itemId];

    req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE id = ?`, values, function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Updated" });
    });
};

const handleDeleteItem = (table) => (req, res) => {
    req.tenantDb.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.itemId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
    });
};

// ==========================================
// 🚀 ROUTES
// ==========================================

// House Details (Single)
router.get('/households/:id/details', authenticateToken, useTenantDb, handleGetSingle('house_details'));
router.put('/households/:id/details', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateSingle('house_details'));

// Water Info (Single)
router.get('/households/:id/water', authenticateToken, useTenantDb, handleGetSingle('water_info'));
router.put('/households/:id/water', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateSingle('water_info'));

// Council Info (Single)
router.get('/households/:id/council', authenticateToken, useTenantDb, handleGetSingle('council_info'));
router.put('/households/:id/council', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateSingle('council_info'));

// Waste Info (Single)
router.get('/households/:id/waste', authenticateToken, useTenantDb, handleGetSingle('waste_info'));
router.put('/households/:id/waste', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateSingle('waste_info'));

// Vehicles (List)
router.get('/households/:id/vehicles', authenticateToken, useTenantDb, handleGetList('vehicles'));
router.post('/households/:id/vehicles', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('vehicles'));
router.put('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('vehicles'));
router.delete('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('vehicles'));

// Assets (List)
router.get('/households/:id/assets', authenticateToken, useTenantDb, handleGetList('assets'));
router.post('/households/:id/assets', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('assets'));
router.put('/households/:id/assets/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('assets'));
router.delete('/households/:id/assets/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('assets'));

// Energy Accounts (List)
router.get('/households/:id/energy', authenticateToken, useTenantDb, handleGetList('energy_accounts'));
router.post('/households/:id/energy', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('energy_accounts'));
router.put('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('energy_accounts'));
router.delete('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('energy_accounts'));

module.exports = router;
