const express = require('express');
const router = express.Router();
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { getHouseholdDb } = require('../db');

// --- MEALS ---

// List Meals
router.get('/households/:id/meals', authenticateToken, requireHouseholdRole('viewer'), (req, res) => {
    const db = getHouseholdDb(req.params.id);
    db.all("SELECT * FROM meals WHERE household_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Meal
router.post('/households/:id/meals', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const { name, description, emoji } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const db = getHouseholdDb(req.params.id);
    db.run(
        "INSERT INTO meals (household_id, name, description, emoji) VALUES (?, ?, ?, ?)",
        [req.params.id, name, description, emoji],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, description, emoji });
        }
    );
});

// Update Meal
router.put('/households/:id/meals/:mealId', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const { name, description, emoji } = req.body;
    const db = getHouseholdDb(req.params.id);
    
    db.run(
        "UPDATE meals SET name = ?, description = ?, emoji = ? WHERE id = ? AND household_id = ?",
        [name, description, emoji, req.params.mealId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated" });
        }
    );
});

// Delete Meal
router.delete('/households/:id/meals/:mealId', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const db = getHouseholdDb(req.params.id);
    db.run(
        "DELETE FROM meals WHERE id = ? AND household_id = ?",
        [req.params.mealId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
        }
    );
});

// --- MEAL PLANS ---

// Get Plans (Range)
router.get('/households/:id/meal-plans', authenticateToken, requireHouseholdRole('viewer'), (req, res) => {
    const { start, end } = req.query; // YYYY-MM-DD
    const db = getHouseholdDb(req.params.id);
    
    let sql = `
        SELECT mp.*, m.name as meal_name, m.emoji as meal_emoji 
        FROM meal_plans mp 
        LEFT JOIN meals m ON mp.meal_id = m.id 
        WHERE mp.household_id = ?
    `;
    const params = [req.params.id];

    if (start && end) {
        sql += " AND mp.date BETWEEN ? AND ?";
        params.push(start, end);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Assign Meal
router.post('/households/:id/meal-plans', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const { date, member_id, meal_id, type } = req.body;
    if (!date || !member_id || !meal_id) return res.status(400).json({ error: "Missing fields" });

    const db = getHouseholdDb(req.params.id);
    db.run(
        "INSERT INTO meal_plans (household_id, date, member_id, meal_id, type) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, date, member_id, meal_id, type || 'dinner'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Copy Previous Week
router.post('/households/:id/meal-plans/copy-previous', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const { targetDate } = req.body; // Any date in the target week, or specifically the start
    if (!targetDate) return res.status(400).json({ error: "Target date required" });

    const db = getHouseholdDb(req.params.id);
    
    // Logic: Look back 7 days for the "Source"
    // Let's expand the range to a full week to be safe if they pass Monday.
    const startOfTargetWeek = new Date(targetDate); 
    
    const startOfSourceWeek = new Date(startOfTargetWeek);
    startOfSourceWeek.setDate(startOfSourceWeek.getDate() - 7);
    const startOfSourceWeekStr = startOfSourceWeek.toISOString().split('T')[0];

    const endOfSourceWeek = new Date(startOfSourceWeek);
    endOfSourceWeek.setDate(endOfSourceWeek.getDate() + 6);
    const endOfSourceWeekStr = endOfSourceWeek.toISOString().split('T')[0];

    // 1. Get Source Plans
    db.all(
        "SELECT * FROM meal_plans WHERE household_id = ? AND date BETWEEN ? AND ?",
        [req.params.id, startOfSourceWeekStr, endOfSourceWeekStr],
        async (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (rows.length === 0) return res.json({ copiedCount: 0 });

            let copiedCount = 0;
            const stmt = db.prepare("INSERT INTO meal_plans (household_id, date, member_id, meal_id, type) VALUES (?, ?, ?, ?, ?)");

            const processRow = (row) => {
                return new Promise((resolve, reject) => {
                    const oldDate = new Date(row.date);
                    const newDate = new Date(oldDate);
                    newDate.setDate(newDate.getDate() + 7);
                    const newDateStr = newDate.toISOString().split('T')[0];

                    db.get(
                        "SELECT id FROM meal_plans WHERE household_id=? AND date=? AND member_id=? AND meal_id=? AND type=?",
                        [req.params.id, newDateStr, row.member_id, row.meal_id, row.type],
                        (checkErr, existing) => {
                            if (checkErr) return reject(checkErr);
                            if (!existing) {
                                stmt.run([req.params.id, newDateStr, row.member_id, row.meal_id, row.type], (runErr) => {
                                    if (runErr) return reject(runErr);
                                    copiedCount++;
                                    resolve();
                                });
                            } else {
                                resolve();
                            }
                        }
                    );
                });
            };

            try {
                await Promise.all(rows.map(processRow));
                stmt.finalize();
                res.json({ copiedCount });
            } catch (procErr) {
                stmt.finalize();
                res.status(500).json({ error: procErr.message });
            }
        }
    );
});

// Remove Plan Entry
router.delete('/households/:id/meal-plans/:planId', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const db = getHouseholdDb(req.params.id);
    db.run(
        "DELETE FROM meal_plans WHERE id = ? AND household_id = ?",
        [req.params.planId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
        }
    );
});

module.exports = router;
