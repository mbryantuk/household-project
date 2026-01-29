const express = require('express');
const router = express.Router({ mergeParams: true });
const { getHouseholdDb } = require('../db');
// ... (rest of imports)

/**
 * Multi-Tenancy Enforcement:
 */
const useTenantDb = (req, res, next) => {
    // If mounted at /households/:id/finance, 'id' comes from req.params.id
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

// ... (encryption/decryption helpers)

// ==========================================
// 🏠 GENERIC CRUD HELPERS (Tenant-Aware)
// ==========================================

// ... (helpers)

// ==========================================
// 🚀 ROUTES
// ==========================================

// --- ASSIGNMENTS (Member Linking) ---
// ... (handleAssignMember, etc.)

router.get('/assignments', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetAssignments);
router.post('/assignments', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleAssignMember);
router.delete('/assignments/:entity_type/:entity_id/:member_id', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUnassignMember);

// --- INCOME ---
router.get('/income', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_income'));
router.post('/income', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_income'));
router.put('/income/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_income'));
router.delete('/income/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_income'));

// --- SAVINGS ---
router.get('/savings', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_savings'));
router.post('/savings', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_savings'));
router.put('/savings/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_savings'));
router.delete('/savings/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_savings'));

// --- SAVINGS POTS ---
router.get('/savings/pots', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    const sql = `
        SELECT p.*, s.institution, s.account_name, s.emoji as account_emoji, s.current_balance
        FROM finance_savings_pots p
        JOIN finance_savings s ON p.savings_id = s.id
        WHERE s.household_id = ?
    `;
    req.tenantDb.all(sql, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

router.get('/savings/:savingsId/pots', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleSubList('finance_savings_pots', 'finance_savings', 'savingsId'));
router.post('/savings/:savingsId/pots', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubCreate('finance_savings_pots', 'finance_savings', 'savingsId'));
router.put('/savings/:savingsId/pots/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubUpdate('finance_savings_pots', 'finance_savings', 'savingsId'));
router.delete('/savings/:savingsId/pots/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubDelete('finance_savings_pots', 'finance_savings', 'savingsId'));

// --- CREDIT CARDS ---
router.get('/credit-cards', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_credit_cards'));
router.post('/credit-cards', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_credit_cards'));
router.put('/credit-cards/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_credit_cards'));
router.delete('/credit-cards/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_credit_cards'));

// --- LOANS ---
router.get('/loans', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_loans'));
router.post('/loans', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_loans'));
router.put('/loans/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_loans'));
router.delete('/loans/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_loans'));

// --- MORTGAGES ---
router.get('/mortgages', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_mortgages'));
router.post('/mortgages', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_mortgages'));
router.put('/mortgages/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_mortgages'));
router.delete('/mortgages/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_mortgages'));

// --- INVESTMENTS ---
router.get('/investments', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_investments'));
router.post('/investments', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_investments'));
router.put('/investments/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_investments'));
router.delete('/investments/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_investments'));

// --- PENSIONS ---
router.get('/pensions', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_pensions'));
router.post('/pensions', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_pensions'));
router.put('/pensions/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_pensions'));
router.delete('/pensions/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_pensions'));

// --- FINANCE AGREEMENTS ---
router.get('/agreements', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_agreements'));
router.post('/agreements', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_agreements'));
router.put('/agreements/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_agreements'));
router.delete('/agreements/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_agreements'));

// --- VEHICLE FINANCE ---
router.get('/vehicle-finance', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('vehicle_finance'));
router.post('/vehicle-finance', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('vehicle_finance'));
router.put('/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('vehicle_finance'));
router.delete('/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('vehicle_finance'));

// --- PENSIONS HISTORY ---
router.get('/pensions/:pensionId/history', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleSubList('finance_pensions_history', 'finance_pensions', 'pensionId'));
router.post('/pensions/:pensionId/history', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubCreate('finance_pensions_history', 'finance_pensions', 'pensionId'));
router.delete('/pensions/:pensionId/history/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubDelete('finance_pensions_history', 'finance_pensions', 'pensionId'));


// --- BUDGET CATEGORIES ---
router.get('/categories', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_budget_categories'));
router.post('/categories', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_budget_categories'));
router.delete('/categories/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_budget_categories'));

// --- BUDGET PROGRESS ---
router.get('/budget-progress', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM finance_budget_progress WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// --- BUDGET CYCLES ---
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
            if (err) {
                req.tenantDb.run("ROLLBACK");
                closeDb(req);
                return res.status(500).json({ error: err.message });
            }
            req.tenantDb.run("COMMIT", () => {
                closeDb(req);
                res.json({ message: "Cycle reset" });
            });
        });
    });
});

router.post('/budget-cycles', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycle_start, actual_pay, current_balance } = req.body;
    req.tenantDb.run(
        `INSERT INTO finance_budget_cycles (household_id, cycle_start, actual_pay, current_balance) VALUES (?, ?, ?, ?)
         ON CONFLICT(household_id, cycle_start) DO UPDATE SET actual_pay = excluded.actual_pay, current_balance = excluded.current_balance`,
        [req.hhId, cycle_start, actual_pay, current_balance],
        function(err) {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Cycle updated" });
        }
    );
});

router.post('/budget-progress', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycle_start, item_key, is_paid, actual_amount } = req.body;
    const newAmount = parseFloat(actual_amount) || 0;
    const newPaid = parseInt(is_paid) || 0;

    // 1. Get existing progress to calculate delta for savings pots
    req.tenantDb.get(
        `SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`,
        [req.hhId, cycle_start, item_key],
        (err, row) => {
            if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }

            const oldPaid = row ? (row.is_paid || 0) : 0;
            const oldAmount = row ? (row.actual_amount || 0) : 0;

            // Calculate delta for savings pots
            // If it's a pot, we want to know how much to add/remove from the actual pot balance
            let delta = 0;
            if (item_key.startsWith('pot_')) {
                if (newPaid && !oldPaid) {
                    delta = newAmount; // Newly paid
                } else if (!newPaid && oldPaid) {
                    delta = -oldAmount; // Unpaid
                } else if (newPaid && oldPaid) {
                    delta = newAmount - oldAmount; // Still paid, but amount changed
                }
            }

            req.tenantDb.serialize(() => {
                req.tenantDb.run("BEGIN TRANSACTION");

                // Update Progress
                req.tenantDb.run(
                    `INSERT INTO finance_budget_progress (household_id, cycle_start, item_key, is_paid, actual_amount) VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT(household_id, cycle_start, item_key) DO UPDATE SET is_paid = excluded.is_paid, actual_amount = excluded.actual_amount`,
                    [req.hhId, cycle_start, item_key, newPaid, newAmount],
                    (pErr) => {
                        if (pErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: pErr.message }); }

                        // Update Pot if needed
                        if (delta !== 0 && item_key.startsWith('pot_')) {
                            const potId = item_key.split('_')[1];
                            
                            // Update Pot Amount
                            req.tenantDb.run(
                                `UPDATE finance_savings_pots 
                                 SET current_amount = current_amount + ? 
                                 WHERE id = ? 
                                 AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`,
                                [delta, potId, req.hhId],
                                (potErr) => {
                                    if (potErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: potErr.message }); }

                                    // Update Parent Savings Balance
                                    req.tenantDb.run(
                                        `UPDATE finance_savings 
                                         SET current_balance = current_balance + ? 
                                         WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) 
                                         AND household_id = ?`,
                                        [delta, potId, req.hhId],
                                        (savErr) => {
                                            if (savErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: savErr.message }); }
                                            
                                            req.tenantDb.run("COMMIT", (cErr) => {
                                                closeDb(req);
                                                if (cErr) return res.status(500).json({ error: cErr.message });
                                                res.status(201).json({ message: "Progress saved and savings updated", delta });
                                            });
                                        }
                                    );
                                }
                            );
                        } else {
                            // No pot update needed
                            req.tenantDb.run("COMMIT", (cErr) => {
                                closeDb(req);
                                if (cErr) return res.status(500).json({ error: cErr.message });
                                res.status(201).json({ message: "Progress saved" });
                            });
                        }
                    }
                );
            });
        }
    );
});

router.delete('/budget-progress/:cycleStart/:itemKey', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycleStart, itemKey } = req.params;

    // 1. Check if we need to update a savings pot
    req.tenantDb.get(
        `SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`,
        [req.hhId, cycleStart, itemKey],
        (err, row) => {
            if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
            
            const oldPaid = row ? (row.is_paid || 0) : 0;
            const oldAmount = row ? (row.actual_amount || 0) : 0;
            let delta = 0;

            if (itemKey.startsWith('pot_') && oldPaid) {
                delta = -oldAmount; // We are removing a paid item, so subtract
            }

            req.tenantDb.serialize(() => {
                req.tenantDb.run("BEGIN TRANSACTION");

                // Update Pot if needed
                const updatePotPromise = new Promise((resolve, reject) => {
                    if (delta !== 0) {
                        const potId = itemKey.split('_')[1];
                        req.tenantDb.run(
                            `UPDATE finance_savings_pots 
                             SET current_amount = current_amount + ? 
                             WHERE id = ? 
                             AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`,
                            [delta, potId, req.hhId],
                            (potErr) => {
                                if (potErr) return reject(potErr);
                                // Update Parent Savings Balance
                                req.tenantDb.run(
                                    `UPDATE finance_savings 
                                     SET current_balance = current_balance + ? 
                                     WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) 
                                     AND household_id = ?`,
                                    [delta, potId, req.hhId],
                                    (savErr) => {
                                        if (savErr) return reject(savErr);
                                        resolve();
                                    }
                                );
                            }
                        );
                    } else {
                        resolve();
                    }
                });

                updatePotPromise
                    .then(() => {
                        req.tenantDb.run(
                            `DELETE FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`,
                            [req.hhId, cycleStart, itemKey],
                            (delErr) => {
                                if (delErr) {
                                    req.tenantDb.run("ROLLBACK");
                                    closeDb(req);
                                    return res.status(500).json({ error: delErr.message });
                                }
                                req.tenantDb.run("COMMIT", (cErr) => {
                                    closeDb(req);
                                    if (cErr) return res.status(500).json({ error: cErr.message });
                                    res.json({ message: "Progress removed and savings updated", delta });
                                });
                            }
                        );
                    })
                    .catch(err => {
                        req.tenantDb.run("ROLLBACK");
                        closeDb(req);
                        res.status(500).json({ error: err.message });
                    });
            });
        }
    );
});

// --- CURRENT ACCOUNTS ---
router.get('/current-accounts', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_current_accounts'));
router.post('/current-accounts', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_current_accounts'));
router.put('/current-accounts/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_current_accounts'));
router.delete('/current-accounts/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_current_accounts'));

module.exports = router;
// --- FINANCE AGREEMENTS ---
router.get('/households/:id/finance/agreements', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_agreements'));
router.post('/households/:id/finance/agreements', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_agreements'));
router.put('/households/:id/finance/agreements/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_agreements'));
router.delete('/households/:id/finance/agreements/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_agreements'));

// --- VEHICLE FINANCE ---
router.get('/households/:id/finance/vehicle-finance', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('vehicle_finance'));
router.post('/households/:id/finance/vehicle-finance', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('vehicle_finance'));
router.put('/households/:id/finance/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('vehicle_finance'));
router.delete('/households/:id/finance/vehicle-finance/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('vehicle_finance'));

// --- PENSIONS HISTORY ---
router.get('/households/:id/finance/pensions/:pensionId/history', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleSubList('finance_pensions_history', 'finance_pensions', 'pensionId'));
router.post('/households/:id/finance/pensions/:pensionId/history', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubCreate('finance_pensions_history', 'finance_pensions', 'pensionId'));
router.delete('/households/:id/finance/pensions/:pensionId/history/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleSubDelete('finance_pensions_history', 'finance_pensions', 'pensionId'));


// --- BUDGET CATEGORIES ---
router.get('/households/:id/finance/categories', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_budget_categories'));
router.post('/households/:id/finance/categories', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_budget_categories'));
router.delete('/households/:id/finance/categories/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_budget_categories'));

// --- BUDGET PROGRESS ---
router.get('/households/:id/finance/budget-progress', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM finance_budget_progress WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// --- BUDGET CYCLES ---
router.get('/households/:id/finance/budget-cycles', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM finance_budget_cycles WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

router.delete('/households/:id/finance/budget-cycles/:cycleStart', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycleStart } = req.params;
    req.tenantDb.serialize(() => {
        req.tenantDb.run("BEGIN TRANSACTION");
        req.tenantDb.run(`DELETE FROM finance_budget_cycles WHERE household_id = ? AND cycle_start = ?`, [req.hhId, cycleStart]);
        req.tenantDb.run(`DELETE FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ?`, [req.hhId, cycleStart], (err) => {
            if (err) {
                req.tenantDb.run("ROLLBACK");
                closeDb(req);
                return res.status(500).json({ error: err.message });
            }
            req.tenantDb.run("COMMIT", () => {
                closeDb(req);
                res.json({ message: "Cycle reset" });
            });
        });
    });
});

router.post('/households/:id/finance/budget-cycles', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycle_start, actual_pay, current_balance } = req.body;
    req.tenantDb.run(
        `INSERT INTO finance_budget_cycles (household_id, cycle_start, actual_pay, current_balance) VALUES (?, ?, ?, ?)
         ON CONFLICT(household_id, cycle_start) DO UPDATE SET actual_pay = excluded.actual_pay, current_balance = excluded.current_balance`,
        [req.hhId, cycle_start, actual_pay, current_balance],
        function(err) {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Cycle updated" });
        }
    );
});

router.post('/households/:id/finance/budget-progress', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycle_start, item_key, is_paid, actual_amount } = req.body;
    const newAmount = parseFloat(actual_amount) || 0;
    const newPaid = parseInt(is_paid) || 0;

    // 1. Get existing progress to calculate delta for savings pots
    req.tenantDb.get(
        `SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`,
        [req.hhId, cycle_start, item_key],
        (err, row) => {
            if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }

            const oldPaid = row ? (row.is_paid || 0) : 0;
            const oldAmount = row ? (row.actual_amount || 0) : 0;

            // Calculate delta for savings pots
            // If it's a pot, we want to know how much to add/remove from the actual pot balance
            let delta = 0;
            if (item_key.startsWith('pot_')) {
                if (newPaid && !oldPaid) {
                    delta = newAmount; // Newly paid
                } else if (!newPaid && oldPaid) {
                    delta = -oldAmount; // Unpaid
                } else if (newPaid && oldPaid) {
                    delta = newAmount - oldAmount; // Still paid, but amount changed
                }
            }

            req.tenantDb.serialize(() => {
                req.tenantDb.run("BEGIN TRANSACTION");

                // Update Progress
                req.tenantDb.run(
                    `INSERT INTO finance_budget_progress (household_id, cycle_start, item_key, is_paid, actual_amount) VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT(household_id, cycle_start, item_key) DO UPDATE SET is_paid = excluded.is_paid, actual_amount = excluded.actual_amount`,
                    [req.hhId, cycle_start, item_key, newPaid, newAmount],
                    (pErr) => {
                        if (pErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: pErr.message }); }

                        // Update Pot if needed
                        if (delta !== 0 && item_key.startsWith('pot_')) {
                            const potId = item_key.split('_')[1];
                            
                            // Update Pot Amount
                            req.tenantDb.run(
                                `UPDATE finance_savings_pots 
                                 SET current_amount = current_amount + ? 
                                 WHERE id = ? 
                                 AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`,
                                [delta, potId, req.hhId],
                                (potErr) => {
                                    if (potErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: potErr.message }); }

                                    // Update Parent Savings Balance
                                    req.tenantDb.run(
                                        `UPDATE finance_savings 
                                         SET current_balance = current_balance + ? 
                                         WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) 
                                         AND household_id = ?`,
                                        [delta, potId, req.hhId],
                                        (savErr) => {
                                            if (savErr) { req.tenantDb.run("ROLLBACK"); closeDb(req); return res.status(500).json({ error: savErr.message }); }
                                            
                                            req.tenantDb.run("COMMIT", (cErr) => {
                                                closeDb(req);
                                                if (cErr) return res.status(500).json({ error: cErr.message });
                                                res.status(201).json({ message: "Progress saved and savings updated", delta });
                                            });
                                        }
                                    );
                                }
                            );
                        } else {
                            // No pot update needed
                            req.tenantDb.run("COMMIT", (cErr) => {
                                closeDb(req);
                                if (cErr) return res.status(500).json({ error: cErr.message });
                                res.status(201).json({ message: "Progress saved" });
                            });
                        }
                    }
                );
            });
        }
    );
});

router.delete('/households/:id/finance/budget-progress/:cycleStart/:itemKey', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { cycleStart, itemKey } = req.params;

    // 1. Check if we need to update a savings pot
    req.tenantDb.get(
        `SELECT is_paid, actual_amount FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`,
        [req.hhId, cycleStart, itemKey],
        (err, row) => {
            if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
            
            const oldPaid = row ? (row.is_paid || 0) : 0;
            const oldAmount = row ? (row.actual_amount || 0) : 0;
            let delta = 0;

            if (itemKey.startsWith('pot_') && oldPaid) {
                delta = -oldAmount; // We are removing a paid item, so subtract
            }

            req.tenantDb.serialize(() => {
                req.tenantDb.run("BEGIN TRANSACTION");

                // Update Pot if needed
                const updatePotPromise = new Promise((resolve, reject) => {
                    if (delta !== 0) {
                        const potId = itemKey.split('_')[1];
                        req.tenantDb.run(
                            `UPDATE finance_savings_pots 
                             SET current_amount = current_amount + ? 
                             WHERE id = ? 
                             AND savings_id IN (SELECT id FROM finance_savings WHERE household_id = ?)`,
                            [delta, potId, req.hhId],
                            (potErr) => {
                                if (potErr) return reject(potErr);
                                // Update Parent Savings Balance
                                req.tenantDb.run(
                                    `UPDATE finance_savings 
                                     SET current_balance = current_balance + ? 
                                     WHERE id = (SELECT savings_id FROM finance_savings_pots WHERE id = ?) 
                                     AND household_id = ?`,
                                    [delta, potId, req.hhId],
                                    (savErr) => {
                                        if (savErr) return reject(savErr);
                                        resolve();
                                    }
                                );
                            }
                        );
                    } else {
                        resolve();
                    }
                });

                updatePotPromise
                    .then(() => {
                        req.tenantDb.run(
                            `DELETE FROM finance_budget_progress WHERE household_id = ? AND cycle_start = ? AND item_key = ?`,
                            [req.hhId, cycleStart, itemKey],
                            (delErr) => {
                                if (delErr) {
                                    req.tenantDb.run("ROLLBACK");
                                    closeDb(req);
                                    return res.status(500).json({ error: delErr.message });
                                }
                                req.tenantDb.run("COMMIT", (cErr) => {
                                    closeDb(req);
                                    if (cErr) return res.status(500).json({ error: cErr.message });
                                    res.json({ message: "Progress removed and savings updated", delta });
                                });
                            }
                        );
                    })
                    .catch(err => {
                        req.tenantDb.run("ROLLBACK");
                        closeDb(req);
                        res.status(500).json({ error: err.message });
                    });
            });
        }
    );
});

// --- CURRENT ACCOUNTS ---
router.get('/households/:id/finance/current-accounts', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, handleGetList('finance_current_accounts'));
router.post('/households/:id/finance/current-accounts', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleCreateItem('finance_current_accounts'));
router.put('/households/:id/finance/current-accounts/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleUpdateItem('finance_current_accounts'));
router.delete('/households/:id/finance/current-accounts/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, handleDeleteItem('finance_current_accounts'));

module.exports = router;