const http = require('http');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const VERSION = pkg.version;
const RUN_ID = Date.now();
const DATE_STR = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
const HOUSEHOLD_NAME = `The Brady Bunch (API) v${VERSION} [${DATE_STR}]`;
const ADMIN_EMAIL = `mike.brady.${RUN_ID}@test.com`;
const PASSWORD = "Password123!";
const PRIMARY_USER = "mbryantuk@gmail.com";

function apiRequest(method, urlPath, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = data ? JSON.stringify(data) : '';
        const options = {
            hostname: 'localhost', port: 4001, path: urlPath, method: method,
            headers: { 
                'Content-Type': 'application/json',
                'x-bypass-maintenance': 'true'
            },
            timeout: 30000
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        if (data) options.headers['Content-Length'] = Buffer.byteLength(payload);
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                let parsed = {};
                try { parsed = body ? JSON.parse(body) : {}; } catch (e) { parsed = body; } 
                if (res.statusCode >= 400) reject({ status: res.statusCode, data: parsed, path: urlPath });
                else resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        if (data) req.write(payload);
        req.end();
    });
}

async function seed() {
    console.log(`🚀 LAUNCHING DEFINITIVE MASTER SEED: ${HOUSEHOLD_NAME}`);
    try {
        // 1. SETUP
        await apiRequest('POST', '/api/auth/register', { householdName: HOUSEHOLD_NAME, email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
        const login = await apiRequest('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: PASSWORD });
        const token = login.data.token;
        const hhId = login.data.user.default_household_id || (await apiRequest('GET', '/api/auth/my-households', null, token)).data[0].id;
        await apiRequest('POST', `/api/households/${hhId}/select`, {}, token);
        await apiRequest('POST', `/api/households/${hhId}/users`, { email: PRIMARY_USER, role: 'admin', first_name: 'Matt', password: PASSWORD }, token);

        // 2. HOUSE DETAILS (Valuation & Tech)
        await apiRequest('PUT', `/api/households/${hhId}/details`, {
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
        }, token);

        // 3. MEMBERS
        const members = {};
        const memberDefs = [
            { n: "Mike", t: "adult", e: "👨", d: "1978-05-12" }, 
            { n: "Carol", t: "adult", e: "👩", d: "1982-02-14" }, 
            { n: "Greg", t: "adult", e: "👦", d: "2004-10-20" }, 
            { n: "Marcia", t: "adult", e: "👧", d: "2006-08-05" }, 
            { n: "Peter", t: "child", e: "👦", d: "2008-03-15" }, 
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
            const res = await apiRequest('POST', `/api/households/${hhId}/members`, payload, token);
            members[m.n] = res.data.id;
        }

        // 4. ASSETS
        const assets = [];
        const assetDefs = [
            { n: "Samsung 65\" TV", c: "Electronics", l: "Living Room", v: 1200, i: "insured", e: "📺", m: 0 },
            { n: "MacBook Pro M3", c: "Electronics", l: "Office", v: 2400, i: "insured", e: "💻", m: 15 },
            { n: "Piano", c: "Furniture", l: "Den", v: 5000, i: "insured", e: "🎹", m: 50 }
        ];

        for (const a of assetDefs) {
            const res = await apiRequest('POST', `/api/households/${hhId}/assets`, {
                name: a.n, category: a.c, location: a.l, purchase_value: a.v, 
                insurance_status: a.i, emoji: a.e, monthly_maintenance_cost: a.m
            }, token);
            assets.push(res.data);
        }

        // 5. VEHICLES
        const v1 = await apiRequest('POST', `/api/households/${hhId}/vehicles`, {
            make: "Tesla", model: "Model S", emoji: "⚡", 
            mot_due: "2026-11-01", tax_due: "2026-11-01", registration: "BRADY 1"
        }, token);
        const v2 = await apiRequest('POST', `/api/households/${hhId}/vehicles`, {
            make: "Rivian", model: "R1S", emoji: "🔋",
            mot_due: "2026-08-20", tax_due: "2026-08-20", registration: "BRADY 2"
        }, token);

        // 6. CONSOLIDATED RECURRING COSTS
        const costDefs = [
            // Household Utility/Tax/Insurance
            { n: "Council Tax", a: 280, c: "council", f: "monthly", d: 1, ot: "household" },
            { n: "LA Water", a: 45, c: "water", f: "monthly", d: 15, ot: "household", m: { meter_serial: "H2O-555", supply_type: "metered" } },
            { n: "Pacific Power", a: 250, c: "energy", f: "monthly", d: 20, ot: "household", m: { account_number: "ELEC-222" } },
            { n: "Home Insurance", a: 65, c: "insurance", f: "monthly", d: 12, ot: "household", m: { policy_number: "H-9988-77", provider: "State Farm" } },
            { n: "Life Insurance (Mike)", a: 40, c: "insurance", f: "monthly", d: 1, ot: "member", oi: members.Mike },
            { n: "Life Insurance (Carol)", a: 35, c: "insurance", f: "monthly", d: 1, ot: "member", oi: members.Carol },
            { n: "Home Emergency Cover", a: 15, c: "insurance", f: "monthly", d: 15, ot: "household" },
            
            // Subscriptions & Tech
            { n: "Netflix Premium", a: 18, c: "subscription", f: "monthly", d: 20, ot: "household" },
            { n: "Disney+", a: 12, c: "subscription", f: "monthly", d: 5, ot: "household" },
            { n: "Amazon Prime", a: 10, c: "subscription", f: "monthly", d: 14, ot: "household" },
            { n: "Spotify Family", a: 17, c: "subscription", f: "monthly", d: 2, ot: "household" },
            
            // Vehicle Costs (Tesla)
            { n: "Tesla Insurance", a: 120, c: "insurance", f: "monthly", d: 7, ot: "vehicle", oi: v1.data.id },
            { n: "Tesla Service Plan", a: 45, c: "vehicle_service", f: "monthly", d: 10, ot: "vehicle", oi: v1.data.id },
            { n: "Tesla Extended Warranty", a: 35, c: "insurance", f: "monthly", d: 10, ot: "vehicle", oi: v1.data.id },
            
            // Vehicle Costs (Rivian)
            { n: "Rivian Insurance", a: 135, c: "insurance", f: "monthly", d: 18, ot: "vehicle", oi: v2.data.id },
            { n: "Rivian Service", a: 50, c: "vehicle_service", f: "monthly", d: 14, ot: "vehicle", oi: v2.data.id },
            { n: "Rivian Warranty", a: 40, c: "insurance", f: "monthly", d: 14, ot: "vehicle", oi: v2.data.id },
            
            // Adults Fun Money
            { n: "Golf Club (Mike)", a: 150, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Mike },
            { n: "Gym & Spa (Mike)", a: 85, c: "fun_money", f: "monthly", d: 5, ot: "member", oi: members.Mike },
            { n: "Yoga & Pilates (Carol)", a: 120, c: "fun_money", f: "monthly", d: 3, ot: "member", oi: members.Carol },
            { n: "Book Club & Coffee (Carol)", a: 40, c: "fun_money", f: "monthly", d: 7, ot: "member", oi: members.Carol },
            { n: "College Social (Greg)", a: 200, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Greg },
            { n: "University Fund (Marcia)", a: 200, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Marcia },
            { n: "Retirement Social (Alice)", a: 100, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Alice },

            // Kids Pocket Money
            { n: "Pocket Money (Peter)", a: 25, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Peter },
            { n: "Pocket Money (Jan)", a: 25, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Jan },
            { n: "Pocket Money (Bobby)", a: 20, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Bobby },
            { n: "Pocket Money (Cindy)", a: 20, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Cindy },

            // Pet Expenses
            { n: "Dog Food (Tiger)", a: 60, c: "food", f: "monthly", d: 5, ot: "member", oi: members.Tiger },
            { n: "Pet Insurance (Tiger)", a: 45, c: "insurance", f: "monthly", d: 10, ot: "member", oi: members.Tiger },
            { n: "Vet Wellness Plan (Tiger)", a: 25, c: "health", f: "monthly", d: 15, ot: "member", oi: members.Tiger },
            { n: "Cat Food (Fluffy)", a: 40, c: "food", f: "monthly", d: 5, ot: "member", oi: members.Fluffy },
            { n: "Pet Insurance (Fluffy)", a: 30, c: "insurance", f: "monthly", d: 10, ot: "member", oi: members.Fluffy },
            { n: "Vet Wellness Plan (Fluffy)", a: 20, c: "health", f: "monthly", d: 15, ot: "member", oi: members.Fluffy },

            // TRIGGER OVERDRAFT (Home Office Expansion)
            { n: "Home Office Expansion Loan", a: 3200, c: "loan", f: "monthly", d: 10, ot: "household" }
        ];

        for (const c of costDefs) {
            await apiRequest('POST', `/api/households/${hhId}/finance/recurring-costs`, {
                name: c.n, amount: c.a, category_id: c.c, frequency: c.f, 
                day_of_month: c.d, object_type: c.ot, object_id: c.oi || null,
                metadata: c.m || {}
            }, token);
        }

        // 7. FINANCIAL ACCOUNTS
        // Lower balance and add overdraft limit
        const bank1 = await apiRequest('POST', `/api/households/${hhId}/finance/current-accounts`, { 
            bank_name: "Wells Fargo", 
            account_name: "Checking", 
            current_balance: 4500,
            overdraft_limit: 5000 
        }, token);
        
        // Mike gets paid late in the month now
        await apiRequest('POST', `/api/households/${hhId}/finance/income`, { employer: "Brady Architecture", amount: 9500, is_primary: 1, payment_day: 28, bank_account_id: bank1.data.id, member_id: members.Mike }, token);
        // Carol gets paid on the 20th
        await apiRequest('POST', `/api/households/${hhId}/finance/income`, { employer: "WFH Creative", amount: 4200, is_primary: 0, payment_day: 20, bank_account_id: bank1.data.id, member_id: members.Carol }, token);
        
        // Joint Savings with Pots
        const savRes = await apiRequest('POST', `/api/households/${hhId}/finance/savings`, { institution: "Ally", account_name: "Joint Savings", current_balance: 55000 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/savings/${savRes.data.id}/pots`, { name: "Emergency Fund", target_amount: 30000, current_amount: 30000, emoji: "🚨", deposit_day: 1 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/savings/${savRes.data.id}/pots`, { name: "Hawaii 2026", target_amount: 15000, current_amount: 10000, emoji: "🌋", deposit_day: 1 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/savings/${savRes.data.id}/pots`, { name: "House Repairs", target_amount: 10000, current_amount: 5000, emoji: "🔨", deposit_day: 15 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/savings/${savRes.data.id}/pots`, { name: "Car Replacement", target_amount: 20000, current_amount: 10000, emoji: "🚗", deposit_day: 5 }, token);

        // Individual Savings (No Pots)
        await apiRequest('POST', `/api/households/${hhId}/finance/savings`, { institution: "Marcus", account_name: "Carol's Personal", current_balance: 12500 }, token);

        await apiRequest('POST', `/api/households/${hhId}/finance/investments`, { name: "Vanguard ETF", platform: "Vanguard", current_value: 152000, monthly_contribution: 500, payment_day: 2 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/pensions`, { provider: "Fidelity", plan_name: "401k", current_value: 420000, monthly_contribution: 1200, payment_day: 1 }, token);

        // 7a. DEBT (Mortgages, Loans, Car Finance, Credit Cards)
        // Mortgage
        const mortRes = await apiRequest('POST', `/api/households/${hhId}/finance/mortgages`, {
            lender: "Nationwide", total_amount: 500000, remaining_balance: 425000, 
            interest_rate: 3.49, monthly_payment: 1850, payment_day: 1, emoji: "🏠", asset_id: "primary",
            term_years: 25, repayment_type: "Repayment"
        }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/assignments`, { entity_type: 'finance_mortgages', entity_id: mortRes.data.id, member_id: members.Mike }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/assignments`, { entity_type: 'finance_mortgages', entity_id: mortRes.data.id, member_id: members.Carol }, token);

        // Personal Loan
        const loanRes = await apiRequest('POST', `/api/households/${hhId}/finance/loans`, {
            lender: "Barclays", loan_type: "Personal Improvement", total_amount: 25000, 
            remaining_balance: 12000, monthly_payment: 450, payment_day: 15, emoji: "📝",
            start_date: "2023-01-15"
        }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/assignments`, { entity_type: 'loan', entity_id: loanRes.data.id, member_id: members.Mike }, token);

        // Car Finance (Tesla)
        const carFinRes = await apiRequest('POST', `/api/households/${hhId}/finance/vehicle-finance`, {
            provider: "Tesla Financial Services", total_amount: 60000, remaining_balance: 35000,
            interest_rate: 4.9, monthly_payment: 850, payment_day: 7, emoji: "⚡", vehicle_id: v1.data.id,
            start_date: "2024-01-07", end_date: "2028-01-07"
        }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/assignments`, { entity_type: 'vehicle_finance', entity_id: carFinRes.data.id, member_id: members.Mike }, token);

        // Credit Cards
        const amexRes = await apiRequest('POST', `/api/households/${hhId}/finance/credit-cards`, {
            provider: "American Express", card_name: "Platinum", credit_limit: 25000, 
            current_balance: 4200, apr: 22.9, payment_day: 20, emoji: "💳"
        }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/assignments`, { entity_type: 'credit_card', entity_id: amexRes.data.id, member_id: members.Mike }, token);

        const visaRes = await apiRequest('POST', `/api/households/${hhId}/finance/credit-cards`, {
            provider: "Chase", card_name: "Sapphire Reserve", credit_limit: 15000, 
            current_balance: 1500, apr: 19.9, payment_day: 5, emoji: "💳"
        }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/assignments`, { entity_type: 'credit_card', entity_id: visaRes.data.id, member_id: members.Carol }, token);

        // 8. MEALS
        const recipes = [
            { n: "Meatloaf", e: "🍞", t: "dinner" }, { n: "Spaghetti", e: "🍝", t: "dinner" }, { n: "Tacos", e: "🌮", t: "dinner" }
        ];
        for (const r of recipes) { await apiRequest('POST', `/api/households/${hhId}/meals`, { name: r.n, emoji: r.e, category: r.t }, token); }

        console.log(`✅ DEFINITIVE SEED COMPLETE: ID ${hhId}`);
        process.exit(0);
    } catch (err) { console.error("❌ Seed Failed:", err); process.exit(1); }
}
seed();
