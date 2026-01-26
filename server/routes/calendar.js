const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { getBankHolidays, getPriorWorkingDay, getNextWorkingDay } = require('../services/bankHolidays');

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

router.get('/system/holidays', async (req, res) => {
    try {
        const holidays = await getBankHolidays();
        res.json(holidays);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/households/:id/dates', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res) => {
    const householdId = req.hhId;
    const db = req.tenantDb;

    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });

    const isValid = (d) => d instanceof Date && !isNaN(d);

    try {
        const holidays = await getBankHolidays();
        const now = new Date();

        const [
            dates, costs, incomes, creditCards, water, council, energy,
            mortgages, loans, agreements, vehicleFinance, savings, investments, pensions,
            vehicles, assets, members
        ] = await Promise.all([
            dbAll(`SELECT * FROM dates WHERE household_id = ? ORDER BY date ASC`, [householdId]),
            dbAll(`SELECT * FROM finance_recurring_charges WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_income WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_credit_cards WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM water_accounts WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM council_accounts WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM energy_accounts WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_mortgages WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_loans WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_agreements WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM vehicle_finance WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_savings WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_investments WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM finance_pensions WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM vehicles WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM assets WHERE household_id = ?`, [householdId]),
            dbAll(`SELECT * FROM members WHERE household_id = ?`, [householdId])
        ]);

        const combined = [...dates];

        const generateEvents = (items, type, titleFn, emojiFn, descFn) => {
            items.forEach(item => {
                const freq = (item.frequency || 'monthly').toLowerCase();
                let datesToAdd = [];

                if (freq === 'monthly' || freq === 'quarterly') {
                    const day = parseInt(item.day_of_month);
                    if (!isNaN(day) && day >= 1 && day <= 31) {
                        for (let i = -1; i < 12; i++) {
                            if (freq === 'quarterly' && i % 3 !== 0) continue;
                            const d = new Date(now.getFullYear(), now.getMonth() + i, day);
                            if (isValid(d)) datesToAdd.push(d);
                        }
                    }
                } else if (freq === 'weekly') {
                    const targetDow = parseInt(item.day_of_week); // 0-6 (Sun-Sat)
                    if (!isNaN(targetDow)) {
                        let iter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const endIter = new Date(now.getFullYear(), now.getMonth() + 12, 31);
                        while (iter <= endIter) {
                            if (iter.getDay() === targetDow) {
                                datesToAdd.push(new Date(iter));
                            }
                            iter.setDate(iter.getDate() + 1);
                        }
                    }
                } else if (freq === 'yearly') {
                    const day = parseInt(item.day_of_month) || 1;
                    const month = (parseInt(item.month_of_year) || 1) - 1;
                    datesToAdd.push(new Date(now.getFullYear(), month, day));
                    datesToAdd.push(new Date(now.getFullYear() + 1, month, day));
                } else if (freq === 'one_off' && item.exact_date) {
                    const d = new Date(item.exact_date);
                    if (isValid(d)) datesToAdd.push(d);
                }

                datesToAdd.forEach((eventDate, idx) => {
                    let logic = 'exact';
                    if (type === 'charge') {
                        logic = item.adjust_for_working_day ? 'next' : 'exact';
                    } else {
                        logic = item.nearest_working_day ? 'next' : 'exact';
                    }

                    let finalDate = new Date(eventDate);
                    if (logic === 'next') finalDate = getNextWorkingDay(finalDate, holidays);
                    else if (logic === 'prior') finalDate = getPriorWorkingDay(finalDate, holidays);

                    let extraTitle = '';
                    if (item.linked_entity_type === 'asset') {
                        const asset = assets.find(a => a.id === item.linked_entity_id);
                        if (asset) extraTitle = ` (${asset.emoji || '📦'} ${asset.name})`;
                    } else if (item.linked_entity_type === 'vehicle') {
                        const vehicle = vehicles.find(v => v.id === item.linked_entity_id);
                        if (vehicle) extraTitle = ` (${vehicle.emoji || '🚗'} ${vehicle.make})`;
                    } else if (item.linked_entity_type === 'member') {
                        const member = members.find(m => m.id === item.linked_entity_id);
                        if (member) extraTitle = ` (${member.emoji || '👤'} ${member.alias || member.name})`;
                    }

                    combined.push({
                        id: `${type}_${item.id}_${idx}`,
                        title: titleFn(item) + extraTitle,
                        date: finalDate.toISOString().split('T')[0],
                        type: type,
                        description: descFn(item),
                        emoji: emojiFn(item),
                        is_all_day: 1,
                        resource: item
                    });
                });
            });
        };

        generateEvents(costs, 'charge', c => `💸 ${c.name}`, c => '💸', c => `Recurring charge: £${c.amount}`);
        generateEvents(incomes.map(i => ({ ...i, frequency: i.frequency || 'monthly', day_of_month: i.payment_day })), 'income', inc => `💰 Payday: ${inc.employer}`, inc => inc.emoji || '💰', inc => `Net Pay: £${inc.amount}`);
        generateEvents(creditCards.map(cc => ({ ...cc, frequency: 'monthly', day_of_month: cc.payment_day })), 'bill', cc => `💳 ${cc.card_name} Bill`, cc => cc.emoji || '💳', cc => `${cc.provider} Credit Card Bill`);
        generateEvents(water ? [water].flat().map(w => ({ ...w, frequency: w.frequency || 'monthly', day_of_month: w.payment_day })) : [], 'bill', w => `💧 ${w.provider || 'Water'} Bill`, () => '💧', w => `Water Bill: £${w.monthly_amount || '?'}`);
        generateEvents(council ? [council].flat().map(c => ({ ...c, frequency: c.frequency || 'monthly', day_of_month: c.payment_day })) : [], 'bill', c => `🏛️ Council Tax`, () => '🏛️', c => `Council Tax (${c.authority_name}): £${c.monthly_amount || '?'}`);
        generateEvents(energy.map(e => ({ ...e, frequency: 'monthly', day_of_month: e.payment_day })), 'bill', e => `⚡ ${e.provider || 'Energy'} Bill`, () => '⚡', e => `${e.type} Bill: £${e.monthly_amount || '?'}`);
        generateEvents(mortgages.map(m => ({ ...m, frequency: 'monthly', day_of_month: m.payment_day })), 'bill', m => `🏠 ${m.lender} Payment`, m => m.emoji || '🏠', m => `${m.mortgage_type === 'equity' ? 'Equity Loan' : 'Mortgage'} Payment: £${m.monthly_payment}`);
        generateEvents(loans.map(l => ({ ...l, frequency: 'monthly', day_of_month: l.payment_day })), 'bill', l => `💰 ${l.lender} Loan Payment`, l => l.emoji || '💰', l => `Loan Payment: £${l.monthly_payment}`);
        generateEvents(agreements.map(a => ({ ...a, frequency: 'monthly', day_of_month: a.payment_day })), 'bill', a => `📄 ${a.agreement_name} Payment`, a => a.emoji || '📄', a => `Agreement Payment (${a.provider}): £${a.monthly_payment}`);
        generateEvents(vehicleFinance.map(v => ({ ...v, frequency: v.frequency || 'monthly', day_of_month: v.payment_day })), 'bill', v => `🚗 Vehicle Finance: ${v.provider}`, v => v.emoji || '🚗', v => `Vehicle Finance Payment: £${v.monthly_payment}`);
        generateEvents(savings.map(s => ({ ...s, frequency: 'monthly', day_of_month: s.deposit_day })), 'saving', s => `🎯 Saving: ${s.institution}`, s => s.emoji || '🎯', s => `Monthly Deposit: £${s.deposit_amount}`);
        generateEvents(investments.map(i => ({ ...i, frequency: 'monthly', day_of_month: i.deposit_day })), 'saving', i => `📈 Investment: ${i.name}`, i => i.emoji || '📈', i => `Monthly Deposit: £${i.deposit_amount}`);
        generateEvents(pensions.map(p => ({ ...p, frequency: 'monthly', day_of_month: p.payment_day })), 'saving', p => `👴 Pension: ${p.plan_name}`, p => p.emoji || '👴', p => `Monthly Contribution: £${p.monthly_contribution}`);

        holidays.forEach(hDate => {
            combined.push({ id: `holiday_${hDate}`, title: `🏦 Bank Holiday`, date: hDate, type: 'holiday', emoji: '🇬🇧', is_all_day: 1 });
        });

        closeDb(req);
        res.json(combined);
    } catch (err) {
        closeDb(req);
        console.error("Calendar Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/households/:id/dates/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.get(`SELECT * FROM dates WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Date not found" });
        res.json(row);
    });
});

router.post('/households/:id/dates', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { title, date, end_date, is_all_day, type, description, emoji, recurrence, recurrence_end_date } = req.body;
    if (!title || !date) { closeDb(req); return res.status(400).json({ error: "Title and Start Date are required" }); }
    const sql = `INSERT INTO dates (household_id, title, date, end_date, is_all_day, type, description, emoji, recurrence, recurrence_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    req.tenantDb.run(sql, [req.hhId, title, date, end_date, is_all_day ? 1 : 0, type, description, emoji, recurrence || 'none', recurrence_end_date], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, date, end_date, is_all_day, type, description, emoji, recurrence, recurrence_end_date });
    });
});

router.delete('/households/:id/dates/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    req.tenantDb.run(`DELETE FROM dates WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Date removed" });
    });
});

router.put('/households/:id/dates/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { itemId } = req.params;
    const fields = Object.keys(req.body).filter(f => f !== 'id' && f !== 'household_id');
    if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No fields to update" }); }
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
