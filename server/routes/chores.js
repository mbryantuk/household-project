const express = require('express');
const router = express.Router({ mergeParams: true });
const { getHouseholdDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { addWeeks, addMonths, addDays, parseISO, format } = require('date-fns');

// GET all chores
router.get('/', authenticateToken, (req, res) => {
    const db = getHouseholdDb(req.params.id);
    if (!db) return res.status(404).json({ error: 'Household not found' });

    db.all(`SELECT c.*, m.name as assignee_name, m.emoji as assignee_emoji 
            FROM chores c 
            LEFT JOIN members m ON c.assigned_member_id = m.id
            ORDER BY c.next_due_date ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST new chore
router.post('/', authenticateToken, (req, res) => {
    const db = getHouseholdDb(req.params.id);
    if (!db) return res.status(404).json({ error: 'Household not found' });

    const { name, description, assigned_member_id, frequency, value, next_due_date, emoji } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    db.run(`INSERT INTO chores (household_id, name, description, assigned_member_id, frequency, value, next_due_date, emoji) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, name, description, assigned_member_id || null, frequency || 'one_off', value || 0, next_due_date, emoji || '🧹'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// PUT update chore
router.put('/:choreId', authenticateToken, (req, res) => {
    const db = getHouseholdDb(req.params.id);
    if (!db) return res.status(404).json({ error: 'Household not found' });

    const { name, description, assigned_member_id, frequency, value, next_due_date, emoji } = req.body;

    db.run(`UPDATE chores SET name = ?, description = ?, assigned_member_id = ?, frequency = ?, value = ?, next_due_date = ?, emoji = ? WHERE id = ? AND household_id = ?`,
        [name, description, assigned_member_id || null, frequency, value, next_due_date, emoji, req.params.choreId, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// DELETE chore
router.delete('/:choreId', authenticateToken, (req, res) => {
    const db = getHouseholdDb(req.params.id);
    if (!db) return res.status(404).json({ error: 'Household not found' });

    db.run(`DELETE FROM chores WHERE id = ? AND household_id = ?`, [req.params.choreId, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// POST Complete Chore
router.post('/:choreId/complete', authenticateToken, (req, res) => {
    const db = getHouseholdDb(req.params.id);
    if (!db) return res.status(404).json({ error: 'Household not found' });

    const { member_id, date } = req.body; // Actually who completed it, could be different from assignee

    // 1. Get chore details
    db.get(`SELECT * FROM chores WHERE id = ? AND household_id = ?`, [req.params.choreId, req.params.id], (err, chore) => {
        if (err || !chore) return res.status(404).json({ error: 'Chore not found' });

        const completionDate = date || new Date().toISOString();
        const valueEarned = chore.value || 0;
        const completerId = member_id || chore.assigned_member_id;

        // 2. Log completion
        db.run(`INSERT INTO chore_completions (household_id, chore_id, member_id, completed_at, value_earned) VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, chore.id, completerId, completionDate, valueEarned],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // 3. Update next due date if recurring
                let nextDate = null;
                if (chore.frequency !== 'one_off' && chore.next_due_date) {
                    const currentDue = parseISO(chore.next_due_date);
                    let newDate;
                    switch (chore.frequency) {
                        case 'daily': newDate = addDays(currentDue, 1); break;
                        case 'weekly': newDate = addWeeks(currentDue, 1); break;
                        case 'monthly': newDate = addMonths(currentDue, 1); break;
                        default: newDate = null;
                    }
                    if (newDate) {
                        nextDate = format(newDate, 'yyyy-MM-dd');
                        db.run(`UPDATE chores SET next_due_date = ? WHERE id = ?`, [nextDate, chore.id]);
                    }
                } else if (chore.frequency === 'one_off') {
                    // Maybe delete or mark as archived? For now, we leave it but maybe clear date? 
                    // Actually, usually one-off chores are deleted or just sit there. 
                    // Let's clear the next_due_date to indicate "Done"
                    db.run(`UPDATE chores SET next_due_date = NULL WHERE id = ?`, [chore.id]);
                }

                res.json({ success: true, next_due_date: nextDate, value_earned: valueEarned });
            }
        );
    });
});

// GET Stats (Gamification)
router.get('/stats', authenticateToken, (req, res) => {
    const db = getHouseholdDb(req.params.id);
    if (!db) return res.status(404).json({ error: 'Household not found' });

    // Get earnings per member for this month/week
    const sql = `
        SELECT m.id, m.name, m.emoji, SUM(cc.value_earned) as total_earned, COUNT(cc.id) as tasks_completed
        FROM members m
        JOIN chore_completions cc ON m.id = cc.member_id
        WHERE cc.household_id = ?
        GROUP BY m.id
        ORDER BY total_earned DESC
    `;

    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
