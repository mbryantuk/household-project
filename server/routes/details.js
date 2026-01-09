const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

/**
 * Multi-Tenancy Enforcement:
 * All queries MUST filter by household_id and verify user context via middleware.
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

// ==========================================
// 🏠 GENERIC CRUD HELPERS (Tenant-Aware)
// ==========================================

const handleGetSingle = (table) => (req, res) => {
    req.tenantDb.get(`SELECT * FROM ${table} WHERE household_id = ?`, [req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
};

const handleUpdateSingle = (table) => (req, res) => {
    const fields = Object.keys(req.body).filter(f => f !== 'id');
    if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No fields to update" }); }

    req.body.household_id = req.hhId;
    const actualFields = Object.keys(req.body);
    const sets = actualFields.map(f => `${f} = ?`).join(', ');
    const values = Object.values(req.body);

    req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE household_id = ?`, [...values, req.hhId], function(err) {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        
        if (this.changes === 0) {
            const placeholders = actualFields.join(', ');
            const qs = actualFields.map(() => '?').join(', ');
            req.tenantDb.run(`INSERT INTO ${table} (${placeholders}) VALUES (${qs})`, values, (iErr) => {
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
    req.tenantDb.all(`SELECT * FROM ${table} WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

const handleGetItem = (table) => (req, res) => {
    req.tenantDb.get(`SELECT * FROM ${table} WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Item not found" });
        res.json(row);
    });
};

const handleCreateItem = (table) => (req, res) => {
    req.body.household_id = req.hhId;
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
    const fields = Object.keys(req.body).filter(f => f !== 'id' && f !== 'household_id');
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f]);

    req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE id = ? AND household_id = ?`, [...values, req.params.itemId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Updated" });
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
router.put('/households/:id/details', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateSingle('house_details'));

// Water Info
router.get('/households/:id/water', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetSingle('water_info'));
router.put('/households/:id/water', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateSingle('water_info'));

// Council Info
router.get('/households/:id/council', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetSingle('council_info'));
router.put('/households/:id/council', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateSingle('council_info'));

// Waste Collections
router.get('/households/:id/waste', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('waste_collections'));
router.post('/households/:id/waste', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('waste_collections'));
router.put('/households/:id/waste/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('waste_collections'));
router.delete('/households/:id/waste/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('waste_collections'));

// Vehicles
router.get('/households/:id/vehicles', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('vehicles'));
router.get('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('vehicles'));
router.post('/households/:id/vehicles', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('vehicles'));
router.put('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('vehicles'));
router.delete('/households/:id/vehicles/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('vehicles'));

// Recurring Costs (Misc Costs for everything)
router.get('/households/:id/costs', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('recurring_costs'));
router.post('/households/:id/costs', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('recurring_costs'));
router.put('/households/:id/costs/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('recurring_costs'));
router.delete('/households/:id/costs/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('recurring_costs'));

// Vehicle Sub-modules
const VEHICLE_SUBS = ['services', 'finance', 'insurance'];
VEHICLE_SUBS.forEach(sub => {
    const table = `vehicle_${sub}`;
    router.get(`/households/:id/vehicles/:vehicleId/${sub}`, authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
        req.tenantDb.all(`SELECT * FROM ${table} WHERE vehicle_id = ? AND household_id = ?`, [req.params.vehicleId, req.hhId], (err, rows) => {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
    router.post(`/households/:id/vehicles/:vehicleId/${sub}`, authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
        const data = { ...req.body, vehicle_id: req.params.vehicleId, household_id: req.hhId };
        const fields = Object.keys(data);
        const placeholders = fields.join(', ');
        const qs = fields.map(() => '?').join(', ');
        req.tenantDb.run(`INSERT INTO ${table} (${placeholders}) VALUES (${qs})`, Object.values(data), function(err) {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, ...data });
        });
    });
    router.put(`/households/:id/vehicles/:vehicleId/${sub}/:itemId`, authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
        const fields = Object.keys(req.body).filter(f => f !== 'id' && f !== 'household_id' && f !== 'vehicle_id');
        const sets = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => req.body[f]);
        req.tenantDb.run(`UPDATE ${table} SET ${sets} WHERE id = ? AND vehicle_id = ? AND household_id = ?`, [...values, req.params.itemId, req.params.vehicleId, req.hhId], function(err) {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated" });
        });
    });
    router.delete(`/households/:id/vehicles/:vehicleId/${sub}/:itemId`, authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
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
router.post('/households/:id/assets', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('assets'));
router.put('/households/:id/assets/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('assets'));
router.delete('/households/:id/assets/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('assets'));

// Energy Accounts
router.get('/households/:id/energy', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('energy_accounts'));
router.get('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('energy_accounts'));
router.post('/households/:id/energy', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleCreateItem('energy_accounts'));
router.put('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleUpdateItem('energy_accounts'));
router.delete('/households/:id/energy/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, handleDeleteItem('energy_accounts'));

module.exports = router;