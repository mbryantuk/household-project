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
    const db = req.tenantDb;

    // Helper for Promisified DB calls
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });

    try {
        const holidays = await getBankHolidays();
        const now = new Date();

        // Parallel Fetch of all data sources
        const [
            dates, 
            costs, 
            incomes, 
            creditCards, 
            water, 
            council, 
            energy,
            mortgages,
            loans,
            agreements,
            vehicleFinance,
            savings,
            investments
        ] = await Promise.all([
            dbAll(`SELECT * FROM dates WHERE household_id = ? ORDER BY date ASC`, [householdId]),
            dbAll(`SELECT * FROM recurring_costs WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_income WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_credit_cards WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM water_info WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM council_info WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM energy_accounts WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_mortgages WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_loans WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_agreements WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM vehicle_finance WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_savings WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_investments WHERE household_id = ?`, [householdId])
        ]);

        const combined = [...dates];

        // Helper to generate 12 months of events
        const generateMonthlyEvents = (items, dayField, titleFn, type, emojiFn, descFn) => {
            items.forEach(item => {
                if (!item[dayField]) return;
                const day = parseInt(item[dayField]);
                if (isNaN(day) || day < 1 || day > 31) return;

                for (let i = -1; i < 12; i++) {
                    let eventDate = new Date(now.getFullYear(), now.getMonth() + i, day);
                    // Shift to previous working day if weekend/holiday
                    eventDate = getPriorWorkingDay(eventDate, holidays);
                    
                    combined.push({
                        id: `${type}_${item.id || item.household_id}_${i}`,
                        title: titleFn(item),
                        date: eventDate.toISOString().split('T')[0],
                        type: type,
                        description: descFn(item),
                        emoji: emojiFn(item),
                        is_all_day: 1,
                        resource: item
                    });
                }
            });
        };

        // 1. Recurring Costs
        generateMonthlyEvents(costs, 'payment_day', 
            c => `💸 ${c.name}`, 
            'cost', 
            c => '💸', 
            c => `Recurring cost: £${c.amount}`
        );

        // 2. Income (Paydays)
        generateMonthlyEvents(incomes, 'payment_day', 
            inc => `💰 Payday: ${inc.employer}`, 
            'income', 
            inc => inc.emoji || '💰', 
            inc => `Net Pay: £${inc.amount}`
        );

        // 3. Credit Cards
        generateMonthlyEvents(creditCards, 'payment_day', 
            cc => `💳 ${cc.card_name} Bill`, 
            'bill', 
            cc => cc.emoji || '💳', 
            cc => `${cc.provider} Credit Card Bill`
        );

        // 4. Utilities (Water, Council, Energy)
        generateMonthlyEvents(water, 'payment_day', 
            w => `💧 ${w.provider || 'Water'} Bill`, 
            'bill', 
            () => '💧', 
            w => `Water Bill: £${w.monthly_amount || '?'}`
        );

        generateMonthlyEvents(council, 'payment_day', 
            c => `🏛️ Council Tax`, 
            'bill', 
            () => '🏛️', 
            c => `Council Tax (${c.authority_name}): £${c.monthly_amount || '?'}`
        );

        generateMonthlyEvents(energy, 'payment_day', 
            e => `⚡ ${e.provider || 'Energy'} Bill`, 
            'bill', 
            () => '⚡', 
            e => `${e.type} Bill: £${e.monthly_amount || '?'}`
        );

        // 6. Liabilities (Mortgages, Loans, Agreements, Vehicle Finance)
        generateMonthlyEvents(mortgages, 'payment_day', 
            m => `🏠 ${m.lender} Payment`, 
            'bill', 
            m => m.emoji || '🏠', 
            m => `${m.mortgage_type === 'equity' ? 'Equity Loan' : 'Mortgage'} Payment: £${m.monthly_payment}`
        );

        generateMonthlyEvents(loans, 'payment_day', 
            l => `💰 ${l.lender} Loan Payment`, 
            'bill', 
            l => l.emoji || '💰', 
            l => `Loan Payment: £${l.monthly_payment}`
        );

        generateMonthlyEvents(agreements, 'payment_day', 
            a => `📄 ${a.agreement_name} Payment`, 
            'bill', 
            a => a.emoji || '📄', 
            a => `Agreement Payment (${a.provider}): £${a.monthly_payment}`
        );

        generateMonthlyEvents(vehicleFinance, 'payment_day', 
            v => `🚗 Vehicle Finance: ${v.provider}`, 
            'bill', 
            v => v.emoji || '🚗', 
            v => `Vehicle Finance Payment: £${v.monthly_payment}`
        );

        // 7. Savings & Investments (Recurring Deposits)
        generateMonthlyEvents(savings, 'deposit_day', 
            s => `🎯 Saving: ${s.institution}`, 
            'saving', 
            s => s.emoji || '🎯', 
            s => `Monthly Deposit: £${s.deposit_amount}`
        );

        generateMonthlyEvents(investments, 'deposit_day', 
            i => `📈 Investment: ${i.name}`, 
            'saving', 
            i => i.emoji || '📈', 
            i => `Monthly Deposit: £${i.deposit_amount}`
        );

        // 5. Bank Holidays
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

        closeDb(req);
        res.json(combined);

    } catch (err) {
        closeDb(req);
        console.error("Calendar Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
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