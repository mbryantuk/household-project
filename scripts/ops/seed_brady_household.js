const http = require('http');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const VERSION = pkg.version;
const RUN_ID = Date.now();
const HOUSEHOLD_NAME = `The Brady Bunch (API) v${VERSION} [ID:${RUN_ID}]`;
const ADMIN_EMAIL = `mike.brady.${RUN_ID}@test.com`;
const PASSWORD = "Password123!";
const PRIMARY_USER = "mbryantuk@gmail.com";

function apiRequest(method, urlPath, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = data ? JSON.stringify(data) : '';
        const options = {
            hostname: 'localhost', port: 4001, path: urlPath, method: method,
            headers: { 'Content-Type': 'application/json' },
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
    console.log(`🚀 LAUNCHING PRECISION MORTGAGE SEED: ${HOUSEHOLD_NAME}`);
    try {
        // 1. SETUP
        await apiRequest('POST', '/api/auth/register', { householdName: HOUSEHOLD_NAME, email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
        const login = await apiRequest('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: PASSWORD });
        const token = login.data.token;
        const hhId = login.data.user.default_household_id || (await apiRequest('GET', '/api/auth/my-households', null, token)).data[0].id;
        await apiRequest('POST', `/api/households/${hhId}/select`, {}, token);
        await apiRequest('POST', `/api/households/${hhId}/users`, { email: PRIMARY_USER, role: 'admin', first_name: 'Matt', password: PASSWORD }, token);

        // 2. HOUSE VALUATION (Critical for Equity calculation)
        console.log("   Seeding House Valuation...");
        await apiRequest('PUT', `/api/households/${hhId}/details`, {
            purchase_price: 61000, 
            current_valuation: 2450000,
            property_type: "Brady Residence",
            construction_year: 1960
        }, token);

        // 3. PRECISION MORTGAGE
        console.log("   Seeding Structured Mortgage...");
        const mortgageRes = await apiRequest('POST', `/api/households/${hhId}/finance/mortgages`, {
            lender: "Standard Trust",
            property_address: "4222 Clinton Way",
            total_amount: 1000000,
            remaining_balance: 850000, // This populates 'Total Debt'
            interest_rate: 3.25,       // This populates the percentage
            monthly_payment: 4800,
            term_years: 25,            // This fixes 'nully'
            payment_day: 1,            // This fixes 'Day -'
            repayment_type: "Repayment",
            start_date: "2020-01-01"
        }, token);
        const mId = mortgageRes.data.id;

        // 4. MEMBERS
        const members = {};
        const memberDefs = [{ n: "Mike", t: "adult", e: "👨" }, { n: "Carol", t: "adult", e: "👩" }, { n: "Greg", t: "adult", e: "👦" }, { n: "Alice", t: "adult", e: "👵" }];
        for (const m of memberDefs) {
            const res = await apiRequest('POST', `/api/households/${hhId}/members`, { first_name: m.n, type: m.t, emoji: m.e }, token);
            members[m.n] = res.data.id;
        }

        // 5. BUDGET CYCLES (With Mortgage Progress)
        console.log("   Projecting Budget Progress...");
        const energyRes = await apiRequest('POST', `/api/households/${hhId}/finance/charges`, { name: "Octopus Energy", amount: 280, segment: "utility", frequency: "monthly" }, token);
        const eId = energyRes.data.id;

        for (const date of ["2026-02-01", "2026-03-01", "2026-04-01"]) {
            await apiRequest('POST', `/api/households/${hhId}/finance/budget-cycles`, { cycle_start: date, actual_pay: 12000, current_balance: 15400 }, token);
            if (date !== "2026-04-01") {
                await apiRequest('POST', `/api/households/${hhId}/finance/budget-progress`, { cycle_start: date, item_key: `mortgage_${mId}`, is_paid: 1, actual_amount: 4800 }, token);
                await apiRequest('POST', `/api/households/${hhId}/finance/budget-progress`, { cycle_start: date, item_key: `charge_${eId}`, is_paid: 1, actual_amount: 280 }, token);
            }
        }

        console.log(`✅ PRECISION SEED COMPLETE: ID ${hhId}`);
        process.exit(0);
    } catch (err) { console.error("❌ Seed Failed:", err); process.exit(1); }
}
seed();