const request = require('supertest');
const { app } = require('../server');
const { getHouseholdDb, ensureHouseholdSchema } = require('../db');

describe('Monthly Wrap-Up API', () => {
    let token, householdId;
    const agent = request.agent(app);

    beforeAll(async () => {
        const email = `wrapup_test_${Date.now()}@example.com`;
        const password = 'Password123!';

        // 1. Register User
        await agent.post('/api/auth/register').send({
            householdName: 'WrapUp Test House',
            email: email,
            password: password,
            firstName: 'Wrapper',
            lastName: 'Test'
        });

        // 2. Login to get token and householdId
        const loginRes = await agent.post('/api/auth/login').send({
            email: email,
            password: password
        });

        token = loginRes.body.token;
        householdId = loginRes.body.household.id;

        // 3. Setup DB Data
        const db = getHouseholdDb(householdId);
        await ensureHouseholdSchema(db, householdId);

        // Assume default profile ID is 1
        const profileId = 1;

        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(`INSERT INTO recurring_costs (id, household_id, financial_profile_id, name, amount, category_id, is_active) VALUES (1, ?, ?, 'Rent', 1000, 'housing', 1)`, [householdId, profileId]);
                db.run(`INSERT INTO recurring_costs (id, household_id, financial_profile_id, name, amount, category_id, is_active) VALUES (2, ?, ?, 'Netflix', 15, 'subscription', 1)`, [householdId, profileId]);
                
                db.run(`INSERT INTO finance_budget_progress (household_id, financial_profile_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, ?, '2026-01-01', 'housing_1', 1000, 1)`, [householdId, profileId]);
                db.run(`INSERT INTO finance_budget_progress (household_id, financial_profile_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, ?, '2026-01-01', 'subscription_2', 15, 1)`, [householdId, profileId]);

                db.run(`INSERT INTO finance_budget_progress (household_id, financial_profile_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, ?, '2026-02-01', 'housing_1', 1100, 1)`, [householdId, profileId]);
                
                db.run(`INSERT INTO finance_budget_progress (household_id, financial_profile_id, cycle_start, item_key, actual_amount, is_paid) VALUES (?, ?, '2026-02-01', 'income_1', 3000, 1)`, [householdId, profileId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
        db.close();
    });

    it('should calculate monthly spend and compare to previous month', async () => {
        const res = await agent.get(`/api/households/${householdId}/finance/wrap-up?month=2026-02-01`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.month).toBe('2026-02-01');
        
        // Current Spend: 1100 (Rent)
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
        const res = await agent.get(`/api/households/${householdId}/finance/wrap-up`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(400);
    });
});