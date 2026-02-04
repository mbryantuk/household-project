const request = require('supertest');
const app = require('../App');
const fs = require('fs');
const path = require('path');
const { globalDb } = require('../db');

// Increase timeout for the massive seed operation
jest.setTimeout(60000);

describe('👪 Master Seed: The Brady Bunch', () => {
    let token;
    let hhId;
    const RUN_ID = Date.now();
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    const VERSION = pkg.version;
    const DATE_STR = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    
    // This name format is REQUIRED for cleanup_test_data.js to preserve it
    const HOUSEHOLD_NAME = `The Brady Bunch (API) v${VERSION} [${DATE_STR}]`;
    const ADMIN_EMAIL = `mike.brady.${RUN_ID}@test.com`;
    const PASSWORD = "Password123!";
    const PRIMARY_USER = "mbryantuk@gmail.com";

    test('Should successfully seed the entire Brady Bunch household via API', async () => {
        console.log(`🚀 Seeding Master Household: ${HOUSEHOLD_NAME}`);

        // 1. SETUP: Register & Login
        const regRes = await request(app)
            .post('/api/auth/register')
            .set('x-bypass-maintenance', 'true')
            .send({ householdName: HOUSEHOLD_NAME, email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
        expect(regRes.status).toBe(201);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .set('x-bypass-maintenance', 'true')
            .send({ email: ADMIN_EMAIL, password: PASSWORD });
        expect(loginRes.status).toBe(200);
        token = loginRes.body.token;
        
        // Get Household ID
        const hhRes = await request(app)
            .get('/api/auth/my-households')
            .set('Authorization', `Bearer ${token}`);
        hhId = hhRes.body[0].id;
        expect(hhId).toBeDefined();

        // Select Household
        await request(app)
            .post(`/api/households/${hhId}/select`)
            .set('Authorization', `Bearer ${token}`)
            .send({});

        // Add Primary User (mbryantuk@gmail.com)
        await request(app)
            .post(`/api/households/${hhId}/users`)
            .set('Authorization', `Bearer ${token}`)
            .send({ email: PRIMARY_USER, role: 'admin', first_name: 'Matt', password: PASSWORD });

        // 2. HOUSE DETAILS (Valuation & Tech)
        await request(app)
            .put(`/api/households/${hhId}/details`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                purchase_price: 61000,
                current_valuation: 2450000,
                property_type: "Brady Residence",
                construction_year: 1969,
                tenure: "freehold",
                council_tax_band: "G",
                broadband_provider: "Spectrum",
                broadband_account: "SP-99887766",
                wifi_password: "GroovyPassword123",
                smart_home_hub: "Alexa"
            });

        // 3. MEMBERS
        const members = {};
        const memberDefs = [
            { n: "Mike", t: "adult", e: "👨", d: "1978-05-12" }, 
            { n: "Carol", t: "adult", e: "👩", d: "1982-02-14" }, 
            { n: "Greg", t: "adult", e: "👦", d: "2004-10-20" }, 
            { n: "Marcia", t: "adult", e: "👧", d: "2006-08-05" }, 
            { n: "Peter", t: "child", e: "👦", d: "2008-02-10" }, 
            { n: "Jan", t: "child", e: "👧", d: "2011-01-02" }, 
            { n: "Bobby", t: "child", e: "👦", d: "2013-11-23" }, 
            { n: "Cindy", t: "child", e: "👧", d: "2016-07-08" }, 
            { n: "Alice", t: "adult", e: "👵", d: "1968-09-30" }, 
            { n: "Tiger", t: "pet", e: "🐕", d: null }, 
            { n: "Fluffy", t: "pet", e: "🐈", d: null }
        ];
        
        for (const m of memberDefs) {
            const payload = { first_name: m.n, type: m.t, emoji: m.e };
            if (m.d) payload.dob = m.d;
            const res = await request(app)
                .post(`/api/households/${hhId}/members`)
                .set('Authorization', `Bearer ${token}`)
                .send(payload);
            expect(res.status).toBe(201);
            members[m.n] = res.body.id;
        }

        // 4. ASSETS
        const assetDefs = [
            { n: "Samsung 65\" TV", c: "Electronics", l: "Living Room", v: 1200, i: "insured", e: "📺", m: 0 },
            { n: "MacBook Pro M3", c: "Electronics", l: "Office", v: 2400, i: "insured", e: "💻", m: 15 },
            { n: "Piano", c: "Furniture", l: "Den", v: 5000, i: "insured", e: "🎹", m: 50 }
        ];

        for (const a of assetDefs) {
            await request(app)
                .post(`/api/households/${hhId}/assets`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: a.n, category: a.c, location: a.l, purchase_value: a.v, 
                    insurance_status: a.i, emoji: a.e, monthly_maintenance_cost: a.m
                });
        }

        // 5. VEHICLES
        const v1Res = await request(app)
            .post(`/api/households/${hhId}/vehicles`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                make: "Tesla", model: "Model S", emoji: "⚡", 
                mot_due: "2026-11-01", tax_due: "2026-11-01", registration: "BRADY 1",
                purchase_value: 85000, current_value: 62000
            });
        const v1Id = v1Res.body.id;

        const v2Res = await request(app)
            .post(`/api/households/${hhId}/vehicles`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                make: "Rivian", model: "R1S", emoji: "🔋",
                mot_due: "2026-08-20", tax_due: "2026-08-20", registration: "BRADY 2",
                purchase_value: 95000, current_value: 88000
            });
        const v2Id = v2Res.body.id;

        // 6. RECURRING COSTS
        const costDefs = [
            { n: "Council Tax", a: 280, c: "council", f: "monthly", d: 1, ot: "household" },
            { n: "LA Water", a: 45, c: "water", f: "monthly", d: 15, ot: "household", m: { meter_serial: "H2O-555", supply_type: "metered" } },
            { n: "Pacific Power", a: 250, c: "energy", f: "monthly", d: 20, ot: "household", m: { account_number: "ELEC-222" } },
            { n: "Home Insurance", a: 65, c: "insurance", f: "monthly", d: 12, ot: "household", m: { policy_number: "H-9988-77", provider: "State Farm" } },
            { n: "Life Insurance (Mike)", a: 40, c: "insurance", f: "monthly", d: 1, ot: "member", oi: members.Mike },
            { n: "Life Insurance (Carol)", a: 35, c: "insurance", f: "monthly", d: 1, ot: "member", oi: members.Carol },
            { n: "Netflix Premium", a: 18, c: "subscription", f: "monthly", d: 20, ot: "household" },
            { n: "Disney+", a: 12, c: "subscription", f: "monthly", d: 5, ot: "household" },
            { n: "Tesla Insurance", a: 120, c: "insurance", f: "monthly", d: 7, ot: "vehicle", oi: v1Id },
            { n: "Rivian Insurance", a: 135, c: "insurance", f: "monthly", d: 18, ot: "vehicle", oi: v2Id },
            { n: "Pocket Money (Peter)", a: 25, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Peter },
            { n: "Home Office Expansion Loan", a: 3200, c: "loan", f: "monthly", d: 10, ot: "household" }
        ];

        for (const c of costDefs) {
            await request(app)
                .post(`/api/households/${hhId}/finance/recurring-costs`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: c.n, amount: c.a, category_id: c.c, frequency: c.f, 
                    day_of_month: c.d, object_type: c.ot, object_id: c.oi || null,
                    metadata: c.m || {}
                });
        }

        // 7. FINANCIAL ACCOUNTS
        const bankRes = await request(app)
            .post(`/api/households/${hhId}/finance/current-accounts`)
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                bank_name: "Wells Fargo", 
                account_name: "Checking", 
                current_balance: 9300,
                overdraft_limit: 200 
            });
        const bankId = bankRes.body.id;
        
        const mikeIncRes = await request(app)
            .post(`/api/households/${hhId}/finance/income`)
            .set('Authorization', `Bearer ${token}`)
            .send({ employer: "Brady Architecture", amount: 9500, is_primary: 1, payment_day: 28, bank_account_id: bankId, member_id: members.Mike });
        const mikeIncId = mikeIncRes.body.id;

        await request(app)
            .post(`/api/households/${hhId}/finance/income`)
            .set('Authorization', `Bearer ${token}`)
            .send({ employer: "WFH Creative", amount: 6200, is_primary: 0, payment_day: 20, bank_account_id: bankId, member_id: members.Carol });

        // INITIALIZE BUDGET CYCLE
        const cycleKey = '2026-01-28';
        await request(app)
            .post(`/api/households/${hhId}/finance/budget-cycles`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                cycle_start: cycleKey,
                actual_pay: 15700,
                current_balance: 9300,
                bank_account_id: bankId
            });

        // MARK MIKE'S INCOME AS PAID
        await request(app)
            .post(`/api/households/${hhId}/finance/budget-progress`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                cycle_start: cycleKey,
                item_key: `income_${mikeIncId}_2801`,
                is_paid: 1,
                actual_amount: 9500
            });

        // 8. DEBT
        const mortRes = await request(app)
            .post(`/api/households/${hhId}/finance/mortgages`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                lender: "Nationwide", total_amount: 500000, remaining_balance: 425000, 
                interest_rate: 3.49, monthly_payment: 1850, payment_day: 1, emoji: "🏠", asset_id: "primary",
                term_years: 25, repayment_type: "Repayment"
            });
        
        await request(app)
            .post(`/api/households/${hhId}/finance/assignments`)
            .set('Authorization', `Bearer ${token}`)
            .send({ entity_type: 'finance_mortgages', entity_id: mortRes.body.id, member_id: members.Mike });

        // 9. MEALS
        const recipes = [
            { n: "Meatloaf", e: "🍞", t: "dinner" }, { n: "Spaghetti", e: "🍝", t: "dinner" }, { n: "Tacos", e: "🌮", t: "dinner" },
            { n: "Chicken Roast", e: "🍗", t: "dinner" }, { n: "Fish & Chips", e: "🐟", t: "dinner" }, { n: "Burger Night", e: "🍔", t: "dinner" },
            { n: "Pizza Party", e: "🍕", t: "dinner" }
        ];
        const mealIds = [];
        for (const r of recipes) { 
            const mRes = await request(app)
                .post(`/api/households/${hhId}/meals`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: r.n, emoji: r.e, category: r.t }); 
            mealIds.push(mRes.body.id);
        }

        // 10. MEAL PLANS (1 Year from Jan 01, 2026)
        console.log("🥘 Generating 365 days of meal plans...");
        const startDate = new Date('2026-01-01');
        const adultIds = [members.Mike, members.Carol, members.Alice];
        
        // We'll use a batch-like approach (looping through days)
        // To avoid 365 individual await request(app) calls which might be slow, 
        // but since we're in a test environment and want to be sure of order, we'll do them sequentially or in small chunks.
        for (let i = 0; i < 365; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Assign a dinner for the family (using one of the adults as the "owner")
            const mealId = mealIds[i % mealIds.length];
            const memberId = adultIds[i % adultIds.length];
            
            await request(app)
                .post(`/api/households/${hhId}/meal-plans`)
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    date: dateStr, 
                    member_id: memberId, 
                    meal_id: mealId, 
                    type: 'dinner' 
                });
        }

        console.log(`✅ Master Seed Test Complete: ID ${hhId}`);
    });
});
