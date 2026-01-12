const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { getBankHolidays, getPriorWorkingDay } = require('../services/bankHolidays');

// Middleware to init DB and Table
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

// GET /households/:id/dates
router.get('/households/:id/dates', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res) => {
    const householdId = req.hhId;
    const holidays = await getBankHolidays();

    req.tenantDb.all(`SELECT * FROM dates WHERE household_id = ? ORDER BY date ASC`, [householdId], (err, dates) => {
        if (err) {
            closeDb(req);
            return res.status(500).json({ error: err.message });
        }

        // Fetch recurring costs to also show on calendar
        req.tenantDb.all(`SELECT * FROM recurring_costs WHERE household_id = ?`, [householdId], (err, costs) => {
            closeDb(req);
            if (err) return res.status(500).json({ error: err.message });

            const combined = [...dates];

            // Expand recurring costs into events for the next 12 months for the calendar view
            const now = new Date();
            costs.forEach(cost => {
                if (cost.frequency === 'Monthly' && cost.payment_day) {
                    const day = parseInt(cost.payment_day);
                    if (isNaN(day)) return;

                    for (let i = -1; i < 12; i++) {
                        let eventDate = new Date(now.getFullYear(), now.getMonth() + i, day);
                        
                        // Factor in Nearest Working Day (Prior)
                        if (cost.nearest_working_day) {
                            eventDate = getPriorWorkingDay(eventDate, holidays);
                        }

                        combined.push({
                            id: `cost_${cost.id}_${i}`,
                            title: `💸 ${cost.name}`,
                            date: eventDate.toISOString().split('T')[0],
                            type: 'cost',
                            description: `Recurring cost: £${cost.amount}. ${cost.notes || ''}`,
                            emoji: '💸',
                            is_all_day: 1,
                            resource: cost
                        });
                    }
                }
            });

            // Also add Bank Holidays as events
            holidays.forEach(hDate => {
                combined.push({
                    id: `holiday_${hDate}`,
                    title: `🏦 Bank Holiday`,
                    date: hDate,
                    type: 'holiday',
                    emoji: '🇬🇧',
                    is_all_day: 1
                });
            });

            res.json(combined);
        });
    });
});

// GET /households/:id/dates/:itemId
router.get('/households/:id/dates/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.get(`SELECT * FROM dates WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Date not found" });
        res.json(row);
    });
});

// POST /households/:id/dates
router.post('/households/:id/dates', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        title, date, end_date, is_all_day, type, description, emoji, 
        recurrence, recurrence_end_date 
    } = req.body;
    
    if (!title || !date) {
        closeDb(req);
        return res.status(400).json({ error: "Title and Start Date are required" });
    }

    const sql = `
        INSERT INTO dates (
            household_id, title, date, end_date, is_all_day, type, description, emoji, 
            recurrence, recurrence_end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    req.tenantDb.run(sql, [
        req.hhId, title, date, end_date, is_all_day ? 1 : 0, type, description, emoji, 
        recurrence || 'none', recurrence_end_date
    ], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            id: this.lastID, title, date, end_date, is_all_day, type, description, emoji, 
            recurrence, recurrence_end_date 
        });
    });
});

// DELETE /households/:id/dates/:itemId
router.delete('/households/:id/dates/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    req.tenantDb.run(`DELETE FROM dates WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Date removed" });
    });
});

// PUT /households/:id/dates/:itemId
router.put('/households/:id/dates/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { itemId } = req.params;
    const fields = Object.keys(req.body).filter(f => f !== 'id' && f !== 'household_id');
    
    if (fields.length === 0) {
        closeDb(req);
        return res.status(400).json({ error: "No fields to update" });
    }

    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f]);

    const sql = `UPDATE dates SET ${sets} WHERE id = ? AND household_id = ?`;
    
    req.tenantDb.run(sql, [...values, itemId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Date not found" });
        res.json({ message: "Date updated", id: itemId, ...req.body });
    });
});

module.exports = router;