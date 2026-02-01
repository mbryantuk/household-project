const express = require('express');
const router = express.Router({ mergeParams: true });
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/crypto');

// Import Charges
const chargeRoutes = require('./charges');

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
const SENSITIVE_FIELDS = ['account_number', 'policy_number', 'sort_code'];

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
            res.status(201).json({ id: this.lastID, ...insertData });
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
// 🔗 SUB-RESOURCE HELPERS
// ==========================================

const handleSubList = (childTable, parentTable, parentKey) => (req, res) => {
    const parentId = req.params[parentKey];
    req.tenantDb.get(`SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?`, [parentId, req.hhId], (err, row) => {
        if (err || !row) { closeDb(req); return res.status(404).json({ error: "Parent resource not found" }); }
        req.tenantDb.all(`SELECT * FROM ${childTable} WHERE ${parentKey.replace('Id', '_id')} = ?`, [parentId], (cErr, rows) => {
            closeDb(req);
            if (cErr) return res.status(500).json({ error: cErr.message });
            res.json(rows);
        });
    });
};

const handleSubCreate = (childTable, parentTable, parentKey) => (req, res) => {
    const parentId = req.params[parentKey];
    const foreignKey = parentKey.replace('Id', '_id');
    req.tenantDb.get(`SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?`, [parentId, req.hhId], (err, row) => {
        if (err || !row) { closeDb(req); return res.status(404).json({ error: "Parent resource not found" }); }
        req.tenantDb.all(`PRAGMA table_info(${childTable})`, [], (pErr, cols) => {
            if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
            const validColumns = cols.map(c => c.name);
            const data = { ...req.body, [foreignKey]: parentId };
            const insertData = {};
            Object.keys(data).forEach(key => { if (validColumns.includes(key)) insertData[key] = data[key]; });
            const fields = Object.keys(insertData);
            req.tenantDb.run(`INSERT INTO ${childTable} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, Object.values(insertData), function(iErr) {
                closeDb(req);
                if (iErr) return res.status(500).json({ error: iErr.message });
                res.status(201).json({ id: this.lastID, ...insertData });
            });
        });
    });
};

const handleSubDelete = (childTable, parentTable, parentKey) => (req, res) => {
    const parentId = req.params[parentKey];
    const itemId = req.params.itemId;
    const foreignKey = parentKey.replace('Id', '_id');
    const sql = `DELETE FROM ${childTable} WHERE id = ? AND ${foreignKey} IN (SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?)`;
    req.tenantDb.run(sql, [itemId, parentId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Item not found or access denied" });
        res.json({ message: "Deleted" });
    });
};

const handleSubUpdate = (childTable, parentTable, parentKey) => (req, res) => {
    const parentId = req.params[parentKey];
    const itemId = req.params.itemId;
    const foreignKey = parentKey.replace('Id', '_id');
    req.tenantDb.get(`SELECT id FROM ${parentTable} WHERE id = ? AND household_id = ?`, [parentId, req.hhId], (err, row) => {
        if (err || !row) { closeDb(req); return res.status(404).json({ error: "Parent resource not found" }); }
        req.tenantDb.all(`PRAGMA table_info(${childTable})`, [], (pErr, cols) => {
            if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
            const validColumns = cols.map(c => c.name);
            const data = encryptPayload(req.body);
            const updateData = {};
            Object.keys(data).forEach(key => { if (validColumns.includes(key) && key !== 'id' && key !== foreignKey) updateData[key] = data[key]; });
            const fields = Object.keys(updateData);
            if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No valid fields" }); }
            const sets = fields.map(f => `${f} = ?`).join(', ');
            req.tenantDb.run(`UPDATE ${childTable} SET ${sets} WHERE id = ? AND ${foreignKey} = ?`, [...Object.values(updateData), itemId, parentId], function(uErr) {
                closeDb(req);
                if (uErr) return res.status(500).json({ error: uErr.message });
                res.json({ message: "Updated" });
            });
        });
    });
};

// ==========================================
// 🚀 ROUTES
// ==========================================

const handleAssignMember = (req, res) => {
    const { entity_type, entity_id, member_id } = req.body;
    if (!entity_type || !entity_id || !member_id) return res.status(400).json({ error: "Missing required fields" });
    req.tenantDb.get("SELECT id FROM members WHERE id = ? AND household_id = ?", [member_id, req.hhId], (err, row) => {
        if (err || !row) { closeDb(req); return res.status(404).json({ error: "Member not found" }); }
        req.tenantDb.run(`INSERT OR IGNORE INTO finance_assignments (household_id, entity_type, entity_id, member_id) VALUES (?, ?, ?, ?)`, [req.hhId, entity_type, entity_id, member_id], function(iErr) {
            closeDb(req);
            if (iErr) return res.status(500).json({ error: iErr.message });
            res.status(201).json({ message: "Assigned" });
        });
    });
};

const handleUnassignMember = (req, res) => {
    const { entity_type, entity_id, member_id } = req.params;
    req.tenantDb.run(`DELETE FROM finance_assignments WHERE household_id = ? AND entity_type = ? AND entity_id = ? AND member_id = ?`, [req.hhId, entity_type, entity_id, member_id], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Unassigned" });
    });
};

const handleGetAssignments = (req, res) => {
    let sql = "SELECT * FROM finance_assignments WHERE household_id = ?";
    let params = [req.hhId];
    if (req.query.entity_type) { sql += " AND entity_type = ?"; params.push(req.query.entity_type); }
    if (req.query.entity_id) { sql += " AND entity_id = ?"; params.push(req.query.entity_id); }
    if (req.query.member_id) { sql += " AND member_id = ?"; params.push(req.query.member_id); }
    req.tenantDb.all(sql, params, (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// --- RELATIVE ROUTES (Mounted at /households/:id/finance) ---

router.get('/assignments', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetAssignments);
router.post('/assignments', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleAssignMember);
router.delete('/assignments/:entity_type/:entity_id/:member_id', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUnassignMember);

router.get('/income', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_income'));
router.get('/income/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_income'));
router.post('/income', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_income'));
router.put('/income/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_income'));
router.delete('/income/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_income'));

router.get('/savings/pots', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    const sql = `SELECT p.*, s.institution, s.account_name, s.emoji as account_emoji, s.current_balance FROM finance_savings_pots p JOIN finance_savings s ON p.savings_id = s.id WHERE s.household_id = ?`;
    req.tenantDb.all(sql, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

router.get('/savings', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_savings'));
router.get('/savings/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_savings'));
router.post('/savings', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_savings'));
router.put('/savings/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_savings'));
router.delete('/savings/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_savings'));

router.get('/savings/:savingsId/pots', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleSubList('finance_savings_pots', 'finance_savings', 'savingsId'));
router.post('/savings/:savingsId/pots', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubCreate('finance_savings_pots', 'finance_savings', 'savingsId'));
router.put('/savings/:savingsId/pots/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubUpdate('finance_savings_pots', 'finance_savings', 'savingsId'));
router.delete('/savings/:savingsId/pots/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubDelete('finance_savings_pots', 'finance_savings', 'savingsId'));

router.get('/credit-cards', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_credit_cards'));
router.get('/credit-cards/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_credit_cards'));
router.post('/credit-cards', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_credit_cards'));
router.put('/credit-cards/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_credit_cards'));
router.delete('/credit-cards/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_credit_cards'));

router.get('/loans', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_loans'));
router.get('/loans/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_loans'));
router.post('/loans', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_loans'));
router.put('/loans/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_loans'));
router.delete('/loans/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_loans'));

router.get('/mortgages', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_mortgages'));
router.get('/mortgages/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_mortgages'));
router.post('/mortgages', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_mortgages'));
router.put('/mortgages/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_mortgages'));
router.delete('/mortgages/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_mortgages'));

router.get('/investments', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_investments'));
router.get('/investments/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_investments'));
router.post('/investments', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_investments'));
router.put('/investments/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_investments'));
router.delete('/investments/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_investments'));

router.get('/pensions', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_pensions'));
router.get('/pensions/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_pensions'));
router.post('/pensions', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_pensions'));
router.put('/pensions/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_pensions'));
router.delete('/pensions/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_pensions'));

router.get('/agreements', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_agreements'));
router.get('/agreements/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_agreements'));
router.post('/agreements', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_agreements'));
router.put('/agreements/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_agreements'));
router.delete('/agreements/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_agreements'));

router.get('/vehicle-finance', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('vehicle_finance'));
router.get('/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('vehicle_finance'));
router.post('/vehicle-finance', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('vehicle_finance'));
router.put('/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('vehicle_finance'));
router.delete('/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('vehicle_finance'));

router.get('/pensions/:pensionId/history', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleSubList('finance_pensions_history', 'finance_pensions', 'pensionId'));
router.post('/pensions/:pensionId/history', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubCreate('finance_pensions_history', 'finance_pensions', 'pensionId'));
router.delete('/pensions/:pensionId/history/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubDelete('finance_pensions_history', 'finance_pensions', 'pensionId'));

router.get('/categories', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_budget_categories'));
router.post('/categories', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_budget_categories'));
router.delete('/categories/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_budget_categories'));

router.get('/budget-progress', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM finance_budget_progress WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

router.get('/budget-cycles', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM finance_budget_cycles WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

router.delete('/budget-cycles/:cycleStart', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycleStart } = req.params;
    req.tenantDb.serialize(() => {
        req.tenantDb.run("BEGIN TRANSACTION");
        req.tenantDb.run(`DELETE FROM finance_budget_cycles WHERE household_id = ? AND cycle_start = ?`, [req.hhId, cycleStart]);
        req.tenantDb.run(`DELETE FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ?`, [req.hhId, cycleStart], (err) => {
            if (err) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: err.message }); }
            req.tenantDb.run("COMMIT", () => { closeDb(req); res.json({ message: "Cycle reset" }); });
        });
    });
});

router.post('/budget-cycles', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycle_start, actual_pay, current_balance } = req.body;
    req.tenantDb.run(`INSERT INTO finance_budget_cycles (household_id, cycle_start, actual_pay, current_balance) VALUES (?, ?, ?, ?) ON CONFLICT(household_id, cycle_start) DO UPDATE SET actual_pay = excluded.actual_pay, current_balance = excluded.current_balance`, [req.hhId, cycle_start, actual_pay, current_balance], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Cycle updated" });
    });
});

router.post('/budget-progress', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycle_start, item_key, is_paid, actual_amount } = req.body;
    const newAmount = parseFloat(actual_amount) || 0;
    const newPaid = parseInt(is_paid) || 0;
    
    req.tenantDb.get(`SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`, [req.hhId, cycle_start, item_key], (err, row) => {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        
        const oldPaid = row ? (row.is_paid || 0) : 0;
        const oldAmount = row ? (row.actual_amount || 0) : 0;
        let delta = 0;
        
        // Logic: Calculate delta if it's a Pot (pot_ID)
        // If becoming Paid: +newAmount
        // If becoming Unpaid: -oldAmount
        // If staying Paid but amount changes: +(newAmount - oldAmount)
        if (item_key.startsWith('pot_')) {
            if (newPaid && !oldPaid) {
                delta = newAmount;
            } else if (!newPaid && oldPaid) {
                delta = -oldAmount;
            } else if (newPaid && oldPaid) {
                delta = newAmount - oldAmount;
            }
        }

        req.tenantDb.serialize(() => {
            req.tenantDb.run("BEGIN TRANSACTION");
            req.tenantDb.run(`INSERT INTO finance_budget_progress (household_id, cycle_start, item_key, is_paid, actual_amount) VALUES (?, ?, ?, ?, ?) ON CONFLICT(household_id, cycle_start, item_key) DO UPDATE SET is_paid = excluded.is_paid, actual_amount = excluded.actual_amount`, [req.hhId, cycle_start, item_key, newPaid, newAmount], (pErr) => {
                if (pErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: pErr.message }); }
                
                if (delta !== 0 && item_key.startsWith('pot_')) {
                    const potId = item_key.split('_')[1];
                    // Update Pot Balance
                    req.tenantDb.run(`UPDATE finance_savings_pots SET current_amount = current_amount + ? WHERE id = ? AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`, [delta, potId, req.hhId], (potErr) => {
                        if (potErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: potErr.message }); }
                        // Update Parent Savings Account Balance
                        req.tenantDb.run(`UPDATE finance_savings SET current_balance = current_balance + ? WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) AND household_id = ?`, [delta, potId, req.hhId], (savErr) => {
                            if (savErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: savErr.message }); }
                            req.tenantDb.run("COMMIT", (cErr) => { closeDb(req); res.status(201).json({ message: "Progress saved and savings updated", delta }); });
                        });
                    });
                } else {
                    req.tenantDb.run("COMMIT", (cErr) => { closeDb(req); res.status(201).json({ message: "Progress saved" }); });
                }
            });
        });
    });
});

router.delete('/budget-progress/:cycleStart/:itemKey', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycleStart, itemKey } = req.params;
    req.tenantDb.get(`SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`, [req.hhId, cycleStart, itemKey], (err, row) => {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        
        const oldPaid = row ? (row.is_paid || 0) : 0;
        const oldAmount = row ? (row.actual_amount || 0) : 0;
        let delta = 0;
        
        // Logic: If we remove a record that was "Paid", we must reverse the balance change
        if (itemKey.startsWith('pot_') && oldPaid) {
            delta = -oldAmount;
        }

        req.tenantDb.serialize(() => {
            req.tenantDb.run("BEGIN TRANSACTION");
            const updatePotPromise = new Promise((resolve, reject) => {
                if (delta !== 0) {
                    const potId = itemKey.split('_')[1];
                    req.tenantDb.run(`UPDATE finance_savings_pots SET current_amount = current_amount + ? WHERE id = ? AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`, [delta, potId, req.hhId], (potErr) => {
                        if (potErr) return reject(potErr);
                        req.tenantDb.run(`UPDATE finance_savings SET current_balance = current_balance + ? WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) AND household_id = ?`, [delta, potId, req.hhId], (savErr) => {
                            if (savErr) return reject(savErr);
                            resolve();
                        });
                    });
                } else {
                    resolve();
                }
            });

            updatePotPromise.then(() => {
                req.tenantDb.run(`DELETE FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`, [req.hhId, cycleStart, itemKey], (delErr) => {
                    if (delErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: delErr.message }); }
                    req.tenantDb.run("COMMIT", (cErr) => { closeDb(req); res.json({ message: "Progress removed and savings updated", delta }); });
                });
            }).catch(err => {
                req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: err.message });
            });
        });
    });
});

router.get('/current-accounts', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_current_accounts'));
router.get('/current-accounts/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetItem('finance_current_accounts'));
router.post('/current-accounts', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_current_accounts'));
router.put('/current-accounts/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_current_accounts'));
router.delete('/current-accounts/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_current_accounts'));

// Mount charges
router.use('/charges', chargeRoutes);

module.exports = router;