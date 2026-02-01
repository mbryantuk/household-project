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
                const parsed = body ? JSON.parse(body) : {};
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

        // 3. MEMBERS (With DOBs)
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

        // 4. ASSETS (Furniture, Tech, etc.)
        const assets = [];
        const assetDefs = [
            { n: "Samsung 65\" TV", c: "Electronics", l: "Living Room", v: 1200, i: "insured", e: "📺", m: 0 },
            { n: "MacBook Pro M3", c: "Electronics", l: "Office", v: 2400, i: "insured", e: "💻", m: 15 }, // m = maintenance cost (AppleCare)
            { n: "Ikea Sofa", c: "Furniture", l: "Living Room", v: 800, i: "uninsured", e: "🛋️", m: 0 },
            { n: "Dyson Vacuum", c: "Appliance", l: "Closet", v: 400, i: "self-insured", e: "🧹", m: 0 },
            { n: "Weber Grill", c: "Tool", l: "Garden", v: 350, i: "uninsured", e: "🥩", m: 0 },
            { n: "Piano", c: "Furniture", l: "Den", v: 5000, i: "insured", e: "🎹", m: 50 } // Tuning cost
        ];

        for (const a of assetDefs) {
            const res = await apiRequest('POST', `/api/households/${hhId}/assets`, {
                name: a.n, category: a.c, location: a.l, purchase_value: a.v, 
                insurance_status: a.i, emoji: a.e, monthly_maintenance_cost: a.m
            }, token);
            assets.push(res.data);
        }

        // 5. VEHICLES + DETAILED SUB-MODULES
        // Tesla
        const v1 = await apiRequest('POST', `/api/households/${hhId}/vehicles`, {
            make: "Tesla", model: "Model S", emoji: "⚡", 
            mot_due: "2026-11-01", tax_due: "2026-11-01", registration: "BRADY 1"
        }, token);
        await apiRequest('POST', `/api/households/${hhId}/vehicles/${v1.data.id}/finance`, { provider: "Tesla Finance", total_amount: 80000, remaining_balance: 45000, monthly_payment: 850, payment_day: 5 }, token);
        const v1Ins = await apiRequest('POST', `/api/households/${hhId}/vehicles/${v1.data.id}/insurance`, { provider: "Direct Line", policy_number: "DL-12345", premium: 1200, renewal_date: "2027-01-15" }, token);
        
        // Rivian
        const v2 = await apiRequest('POST', `/api/households/${hhId}/vehicles`, {
            make: "Rivian", model: "R1S", emoji: "🔋",
            mot_due: "2026-08-20", tax_due: "2026-08-20", registration: "BRADY 2"
        }, token);
        await apiRequest('POST', `/api/households/${hhId}/vehicles/${v2.data.id}/finance`, { provider: "Rivian Financial", total_amount: 75000, remaining_balance: 62000, monthly_payment: 920, payment_day: 15 }, token);
        const v2Svc = await apiRequest('POST', `/api/households/${hhId}/vehicles/${v2.data.id}/service_plans`, { provider: "Rivian Care", monthly_cost: 50, start_date: "2025-01-01", end_date: "2028-01-01" }, token);

        // 6. HOUSEHOLD BILLS (Specific Tabs)
        const councilRes = await apiRequest('POST', `/api/households/${hhId}/council`, { authority_name: "Los Angeles County", account_number: "LA-998877", monthly_amount: 280, payment_day: 1, band: "D" }, token);
        const waterRes = await apiRequest('POST', `/api/households/${hhId}/water`, { provider: "LA Water", account_number: "H2O-555", monthly_amount: 45, payment_day: 15, supply_type: "metered" }, token);
        const energyRes = await apiRequest('POST', `/api/households/${hhId}/energy`, { provider: "Pacific Power", account_number: "ELEC-222", type: "dual", monthly_amount: 250, payment_day: 20 }, token);
        const waste1Res = await apiRequest('POST', `/api/households/${hhId}/waste`, { bin_type: "General", frequency: "weekly", day_of_week: "Tuesday", color: "black", monthly_amount: 0 }, token);
        const waste2Res = await apiRequest('POST', `/api/households/${hhId}/waste`, { bin_type: "Recycling", frequency: "biweekly", day_of_week: "Wednesday", color: "blue", monthly_amount: 0 }, token);

        // 7. FINANCIAL MATRIX
        const bank1 = await apiRequest('POST', `/api/households/${hhId}/finance/current-accounts`, { bank_name: "Wells Fargo", account_name: "Checking", current_balance: 15000 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/income`, { employer: "Brady Architecture", amount: 9500, is_primary: 1, payment_day: 1, bank_account_id: bank1.data.id }, token);
        const mortgageRes = await apiRequest('POST', `/api/households/${hhId}/finance/mortgages`, { lender: "Standard", total_amount: 1000000, remaining_balance: 850000, term_years: 25, payment_day: 1, monthly_payment: 4800 }, token);
        const savRes = await apiRequest('POST', `/api/households/${hhId}/finance/savings`, { institution: "Ally", account_name: "Joint Savings", current_balance: 55000 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/savings/${savRes.data.id}/pots`, { name: "Hawaii 2026", target_amount: 15000, current_amount: 8000, emoji: "🌋", deposit_day: 1 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/credit-cards`, { provider: "Amex", card_name: "Platinum", credit_limit: 20000, current_balance: 1200, emoji: "💳", payment_day: 21 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/credit-cards`, { provider: "Chase", card_name: "Sapphire", credit_limit: 15000, current_balance: 0, emoji: "🟦", payment_day: 28 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/loans`, { lender: "SoFi", loan_type: "Personal", total_amount: 35000, remaining_balance: 22000, monthly_payment: 450, payment_day: 10 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/investments`, { name: "Vanguard ETF", platform: "Vanguard", current_value: 152000, monthly_contribution: 500, payment_day: 2 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/pensions`, { provider: "Fidelity", plan_name: "401k", current_value: 420000, monthly_contribution: 1200, payment_day: 1 }, token);

        // 8. COMPREHENSIVE CHARGES (Linking everything)
        // --- ASSETS ---
        // Link charges to the assets we created in step 4
        const macBook = assets.find(a => a.name.includes("MacBook"));
        const piano = assets.find(a => a.name.includes("Piano"));
        if (macBook) {
            await apiRequest('POST', `/api/households/${hhId}/finance/charges`, {
                name: "AppleCare+", amount: 15, segment: "warranty", frequency: "monthly", day_of_month: 25, 
                linked_entity_type: "asset", linked_entity_id: macBook.id 
            }, token);
        }
        if (piano) {
            await apiRequest('POST', `/api/households/${hhId}/finance/charges`, {
                name: "Piano Tuning", amount: 50, segment: "service", frequency: "monthly", day_of_month: 10, 
                linked_entity_type: "asset", linked_entity_id: piano.id 
            }, token);
        }

        // --- HOUSEHOLD ---
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Council Tax", amount: 280, segment: "household_bill", frequency: "monthly", day_of_month: 1, linked_entity_type: "council_account", linked_entity_id: councilRes.data.id }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Water Bill", amount: 45, segment: "utility", frequency: "monthly", day_of_month: 15, linked_entity_type: "water_account", linked_entity_id: waterRes.data.id }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Energy Bill", amount: 250, segment: "utility", frequency: "monthly", day_of_month: 20, linked_entity_type: "energy_account", linked_entity_id: energyRes.data.id }, token);
        
        // Unlinked charges
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Netflix Premium", amount: 18, segment: "subscription", frequency: "monthly", day_of_month: 20 }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Home Insurance", amount: 65, segment: "insurance", frequency: "monthly", day_of_month: 5 }, token);
        
        // --- VEHICLES ---
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Tesla Charging", amount: 60, segment: "vehicle_fuel", frequency: "monthly", day_of_month: 28, linked_entity_type: "vehicle", linked_entity_id: v1.data.id }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Tesla Insurance", amount: 100, segment: "insurance", frequency: "monthly", day_of_month: 7, linked_entity_type: "vehicle_insurance", linked_entity_id: v1Ins.data.id }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Rivian Service Plan", amount: 50, segment: "vehicle_service", frequency: "monthly", day_of_month: 14, linked_entity_type: "vehicle_service_plan", linked_entity_id: v2Svc.data.id }, token);

        // --- MEMBERS (Adults - Fun Money & More) ---
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Golf Club", amount: 150, segment: "fun_money", frequency: "monthly", day_of_month: 1, linked_entity_type: "member", linked_entity_id: members.Mike }, token);
        await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Yoga Classes", amount: 80, segment: "fun_money", frequency: "monthly", day_of_month: 3, linked_entity_type: "member", linked_entity_id: members.Carol }, token);
        
        // --- MEMBERS (Children - Pocket Money & More) ---
        for (const kid of ["Greg", "Marcia", "Peter", "Jan", "Bobby", "Cindy"]) {
            await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: `Pocket Money (${kid})`, amount: 30, frequency: "monthly", day_of_month: 1, linked_entity_type: "member", linked_entity_id: members[kid], segment: "pocket_money" }, token);
        }

        // 9. MEALS (3 Weeks - FAMILY PLANS)
        const recipes = [
            { n: "Meatloaf", e: "🍞", t: "dinner" }, { n: "Spaghetti", e: "🍝", t: "dinner" }, { n: "Tacos", e: "🌮", t: "dinner" },
            { n: "Pancakes", e: "🥞", t: "breakfast" }, { n: "Cereal", e: "🥣", t: "breakfast" }, { n: "Toast", e: "🍞", t: "breakfast" },
            { n: "Sandwich", e: "🥪", t: "lunch" }, { n: "Salad", e: "🥗", t: "lunch" }, { n: "Soup", e: "🥣", t: "lunch" },
            { n: "Apple", e: "🍎", t: "snack" }, { n: "Yogurt", e: "🍦", t: "snack" }, { n: "Chips", e: "🥔", t: "snack" }
        ];
        
        const mealIds = { dinner: [], breakfast: [], lunch: [], snack: [] };
        for (const r of recipes) { 
            const res = await apiRequest('POST', `/api/households/${hhId}/meals`, { name: r.n, emoji: r.e, category: r.t }, token); 
            mealIds[r.t].push(res.data.id); 
        }

        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        const allHumans = Object.keys(members).filter(n => n !== 'Tiger' && n !== 'Fluffy');
        
        for (let i = 0; i < 21; i++) {
            const d = new Date(); d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            for (const type of mealTypes) {
                const available = mealIds[type];
                const mealId = available[i % available.length];
                
                if (type === 'dinner') {
                    for (const name of allHumans) {
                        await apiRequest('POST', `/api/households/${hhId}/meal-plans`, { date: dateStr, meal_id: mealId, member_id: members[name], type: type }, token);
                    }
                } else {
                    const assignee = allHumans[i % allHumans.length];
                    await apiRequest('POST', `/api/households/${hhId}/meal-plans`, { date: dateStr, meal_id: mealId, member_id: members[assignee], type: type }, token);
                }
            }
        }

        // 10. UPDATE API COVERAGE FOR SLACK
        const coveragePath = path.join(__dirname, '../../server/api-coverage.json');
        if (fs.existsSync(coveragePath)) {
            const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
            coverage.results = coverage.results || {};
            coverage.results["BRADY SEED"] = "PASS";
            coverage.results["BRADY DATA"] = "PASS";
            coverage.steps = coverage.steps || [];
            coverage.steps.push(`${new Date().toISOString().split('T')[1].split('.')[0]}: Brady Household Seeded Successfully.`);
            fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2));
        }

        console.log(`✅ DEFINITIVE SEED COMPLETE: ID ${hhId}`);
        process.exit(0);
    } catch (err) { console.error("❌ Seed Failed:", err); process.exit(1); }
}
seed();
