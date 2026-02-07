const request = require('supertest');
const { app } = require('../server');
const { getHouseholdDb, ensureHouseholdSchema } = require('../db');

describe('Monthly Wrap-Up API', () => {
    let token, householdId;
    const agent = request.agent(app);

    beforeAll(async () => {
        // 1. Register User
        const res = await agent.post('/api/auth/register').send({
            email: 'wrapup_test@example.com',
            password: 'Password123!',
            first_name: 'Wrapper',
            last_name: 'Test'
        });
        token = res.body.token;
        householdId = res.body.household.id;

        // 2. Setup DB Data
        const db = getHouseholdDb(householdId);
        await ensureHouseholdSchema(db, householdId);

        await new Promise((resolve, reject) => {
            db.serialize(() => {
                // Insert Recurring Costs
                db.run(`INSERT INTO recurring_costs (id, household_id, name, amount, category_id) VALUES (1, ?, 'Rent', 1000, 'housing')`, [householdId]);
                db.run(`INSERT INTO recurring_costs (id, household_id, name, amount, category_id) VALUES (2, ?, 'Netflix', 15, 'subscription')`, [householdId]);
                
                // Insert Previous Month (Jan 2026) - Total Spend: 1015
                db.run(`INSERT INTO finance_budget_progress (household_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, '2026-01-01', 'housing_1', 1000, 1)`, [householdId]);
                db.run(`INSERT INTO finance_budget_progress (household_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, '2026-01-01', 'subscription_2', 15, 1)`, [householdId]);

                // Insert Current Month (Feb 2026) - Total Spend: 1100 (Rent went up)
                db.run(`INSERT INTO finance_budget_progress (household_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, '2026-02-01', 'housing_1', 1100, 1)`, [householdId]);
                // Netflix not paid yet
                
                // Income (Should be excluded from spend)
                db.run(`INSERT INTO finance_budget_progress (household_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, '2026-02-01', 'income_1', 3000, 1)`, [householdId]);

                resolve();
            });
        });
    });

    it('should calculate monthly spend and compare to previous month', async () => {
        const res = await agent.get('/api/finance/wrap-up?month=2026-02-01')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.month).toBe('2026-02-01');
        
        // Current Spend: 1100 (Rent) - Netflix not paid
        expect(res.body.total_spent).toBe(1100);
        
        // Previous Spend: 1015
        expect(res.body.prev_month_spent).toBe(1015);
        
        // Delta: (1100 - 1015) / 1015 * 100 = ~8.37%
        expect(res.body.delta_percent).toBeCloseTo(8.37, 1);

        // Costs lookups should be present
        expect(res.body.costs).toBeDefined();
        expect(res.body.costs.find(c => c.name === 'Rent')).toBeDefined();
    });

    it('should return 400 if month is missing', async () => {
        const res = await agent.get('/api/finance/wrap-up')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(400);
    });
});
