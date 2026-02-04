import { test, expect } from '@playwright/test';

test.describe('Brady Bunch Full System State E2E', () => {
    // -----------------------------------------------------------------------------------------
    // TEST CONSTANTS & DATA
    // -----------------------------------------------------------------------------------------
    const RUN_ID = Date.now();
    const VERSION = '3.2.0'; // Hardcoded for test stability
    const DATE_STR = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const HOUSEHOLD_NAME = `The Brady Bunch (E2E) v${VERSION} [${DATE_STR}]`;
    const ADMIN_EMAIL = `mike.brady.${RUN_ID}@test.com`;
    const PASSWORD = "Password123!";
    const PRIMARY_USER = "mbryantuk@gmail.com";
    
    let householdId;
    let authToken;

    // DATA ARRAYS (Copied from seed_brady_household.js)
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

    const assetDefs = [
        { n: "Samsung 65\" TV", c: "Electronics", l: "Living Room", v: 1200, i: "insured", e: "📺", m: 0 },
        { n: "MacBook Pro M3", c: "Electronics", l: "Office", v: 2400, i: "insured", e: "💻", m: 15 },
        { n: "Piano", c: "Furniture", l: "Den", v: 5000, i: "insured", e: "🎹", m: 50 }
    ];

    const recipes = [
        { n: "Meatloaf", e: "🍞", t: "dinner" }, { n: "Spaghetti", e: "🍝", t: "dinner" }, { n: "Tacos", e: "🌮", t: "dinner" }
    ];

    // IDs storage for linking
    const members = {};
    const vehicleIds = {};

    // -----------------------------------------------------------------------------------------
    // API SEEDING (beforeAll)
    // -----------------------------------------------------------------------------------------
    test.beforeAll(async ({ request }) => {
        console.log(`🚀 LAUNCHING E2E SEED: ${HOUSEHOLD_NAME}`);

        // 1. SETUP
        const regRes = await request.post('/api/auth/register', {
            data: { householdName: HOUSEHOLD_NAME, email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 }
        });
        expect(regRes.ok()).toBeTruthy();

        const loginRes = await request.post('/api/auth/login', {
            data: { email: ADMIN_EMAIL, password: PASSWORD }
        });
        expect(loginRes.ok()).toBeTruthy();
        const loginData = await loginRes.json();
        authToken = loginData.token;
        
        // Get Household ID
        const hhRes = await request.get('/api/auth/my-households', { headers: { 'Authorization': `Bearer ${authToken}` } });
        const hhData = await hhRes.json();
        householdId = loginData.user.default_household_id || hhData[0].id;

        // Select Household
        await request.post(`/api/households/${householdId}/select`, { headers: { 'Authorization': `Bearer ${authToken}` } });

        // Add Secondary User (Demo User Access)
        await request.post(`/api/households/${householdId}/users`, {
            data: { email: PRIMARY_USER, role: 'admin', first_name: 'Matt', password: PASSWORD },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // 2. HOUSE DETAILS
        await request.put(`/api/households/${householdId}/details`, {
            data: {
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
            },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // 3. MEMBERS
        for (const m of memberDefs) {
            const payload = { first_name: m.n, type: m.t, emoji: m.e };
            if (m.d) payload.dob = m.d;
            const res = await request.post(`/api/households/${householdId}/members`, {
                data: payload,
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();
            members[m.n] = data.id;
        }

        // 4. ASSETS
        for (const a of assetDefs) {
            await request.post(`/api/households/${householdId}/assets`, {
                data: {
                    name: a.n, category: a.c, location: a.l, purchase_value: a.v, 
                    insurance_status: a.i, emoji: a.e, monthly_maintenance_cost: a.m
                },
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        }

        // 5. VEHICLES
        const v1Res = await request.post(`/api/households/${householdId}/vehicles`, {
            data: {
                make: "Tesla", model: "Model S", emoji: "⚡", 
                mot_due: "2026-11-01", tax_due: "2026-11-01", registration: "BRADY 1",
                purchase_value: 85000, current_value: 62000
            },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const v1Data = await v1Res.json();
        vehicleIds['Tesla'] = v1Data.id;

        const v2Res = await request.post(`/api/households/${householdId}/vehicles`, {
            data: {
                make: "Rivian", model: "R1S", emoji: "🔋",
                mot_due: "2026-08-20", tax_due: "2026-08-20", registration: "BRADY 2",
                purchase_value: 95000, current_value: 88000
            },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const v2Data = await v2Res.json();
        vehicleIds['Rivian'] = v2Data.id;

        // 6. RECURRING COSTS
        const costDefs = [
            { n: "Council Tax", a: 280, c: "council", f: "monthly", d: 1, ot: "household" },
            { n: "LA Water", a: 45, c: "water", f: "monthly", d: 15, ot: "household", m: { meter_serial: "H2O-555", supply_type: "metered" } },
            { n: "Pacific Power", a: 250, c: "energy", f: "monthly", d: 20, ot: "household", m: { account_number: "ELEC-222" } },
            { n: "Home Insurance", a: 65, c: "insurance", f: "monthly", d: 12, ot: "household", m: { policy_number: "H-9988-77", provider: "State Farm" } },
            { n: "Life Insurance (Mike)", a: 40, c: "insurance", f: "monthly", d: 1, ot: "member", oi: members.Mike },
            { n: "Life Insurance (Carol)", a: 35, c: "insurance", f: "monthly", d: 1, ot: "member", oi: members.Carol },
            { n: "Home Emergency Cover", a: 15, c: "insurance", f: "monthly", d: 15, ot: "household" },
            { n: "Netflix Premium", a: 18, c: "subscription", f: "monthly", d: 20, ot: "household" },
            { n: "Disney+", a: 12, c: "subscription", f: "monthly", d: 5, ot: "household" },
            { n: "Amazon Prime", a: 10, c: "subscription", f: "monthly", d: 14, ot: "household" },
            { n: "Spotify Family", a: 17, c: "subscription", f: "monthly", d: 2, ot: "household" },
            { n: "Tesla Insurance", a: 120, c: "insurance", f: "monthly", d: 7, ot: "vehicle", oi: vehicleIds.Tesla },
            { n: "Tesla Service Plan", a: 45, c: "vehicle_service", f: "monthly", d: 10, ot: "vehicle", oi: vehicleIds.Tesla },
            { n: "Tesla Extended Warranty", a: 35, c: "insurance", f: "monthly", d: 10, ot: "vehicle", oi: vehicleIds.Tesla },
            { n: "Rivian Insurance", a: 135, c: "insurance", f: "monthly", d: 18, ot: "vehicle", oi: vehicleIds.Rivian },
            { n: "Rivian Service", a: 50, c: "vehicle_service", f: "monthly", d: 14, ot: "vehicle", oi: vehicleIds.Rivian },
            { n: "Rivian Warranty", a: 40, c: "insurance", f: "monthly", d: 14, ot: "vehicle", oi: vehicleIds.Rivian },
            { n: "Golf Club (Mike)", a: 150, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Mike },
            { n: "Gym & Spa (Mike)", a: 85, c: "fun_money", f: "monthly", d: 5, ot: "member", oi: members.Mike },
            { n: "Yoga & Pilates (Carol)", a: 120, c: "fun_money", f: "monthly", d: 3, ot: "member", oi: members.Carol },
            { n: "Book Club & Coffee (Carol)", a: 40, c: "fun_money", f: "monthly", d: 7, ot: "member", oi: members.Carol },
            { n: "College Social (Greg)", a: 200, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Greg },
            { n: "University Fund (Marcia)", a: 200, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Marcia },
            { n: "Retirement Social (Alice)", a: 100, c: "fun_money", f: "monthly", d: 1, ot: "member", oi: members.Alice },
            { n: "Pocket Money (Peter)", a: 25, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Peter },
            { n: "Pocket Money (Jan)", a: 25, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Jan },
            { n: "Pocket Money (Bobby)", a: 20, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Bobby },
            { n: "Pocket Money (Cindy)", a: 20, c: "pocket_money", f: "monthly", d: 1, ot: "member", oi: members.Cindy },
            { n: "Dog Food (Tiger)", a: 60, c: "food", f: "monthly", d: 5, ot: "member", oi: members.Tiger },
            { n: "Pet Insurance (Tiger)", a: 45, c: "insurance", f: "monthly", d: 10, ot: "member", oi: members.Tiger },
            { n: "Vet Wellness Plan (Tiger)", a: 25, c: "health", f: "monthly", d: 15, ot: "member", oi: members.Tiger },
            { n: "Cat Food (Fluffy)", a: 40, c: "food", f: "monthly", d: 5, ot: "member", oi: members.Fluffy },
            { n: "Pet Insurance (Fluffy)", a: 30, c: "insurance", f: "monthly", d: 10, ot: "member", oi: members.Fluffy },
            { n: "Vet Wellness Plan (Fluffy)", a: 20, c: "health", f: "monthly", d: 15, ot: "member", oi: members.Fluffy },
            { n: "Home Office Expansion Loan", a: 3200, c: "loan", f: "monthly", d: 10, ot: "household" }
        ];

        for (const c of costDefs) {
            await request.post(`/api/households/${householdId}/finance/recurring-costs`, {
                data: {
                    name: c.n, amount: c.a, category_id: c.c, frequency: c.f, 
                    day_of_month: c.d, object_type: c.ot, object_id: c.oi || null,
                    metadata: c.m || {}
                },
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        }

        // 6a. CALENDAR
        await request.post(`/api/households/${householdId}/dates`, {
            data: {
                title: "Grandma's 80th Birthday",
                date: "2026-02-15",
                type: "birthday",
                emoji: "🎂",
                is_all_day: 1
            },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // 7. FINANCIAL ACCOUNTS
        const bank1Res = await request.post(`/api/households/${householdId}/finance/current-accounts`, { 
            data: { bank_name: "Wells Fargo", account_name: "Checking", current_balance: 9300, overdraft_limit: 200 },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const bank1 = await bank1Res.json();
        
        // Incomes
        const mikeIncRes = await request.post(`/api/households/${householdId}/finance/income`, { 
            data: { employer: "Brady Architecture", amount: 9500, is_primary: 1, payment_day: 28, bank_account_id: bank1.id, member_id: members.Mike },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const mikeInc = await mikeIncRes.json();

        await request.post(`/api/households/${householdId}/finance/income`, { 
            data: { employer: "WFH Creative", amount: 6200, is_primary: 0, payment_day: 20, bank_account_id: bank1.id, member_id: members.Carol },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Budget Cycle
        const cycleKey = '2026-01-28';
        await request.post(`/api/households/${householdId}/finance/budget-cycles`, {
            data: { cycle_start: cycleKey, actual_pay: 15700, current_balance: 9300, bank_account_id: bank1.id },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        await request.post(`/api/households/${householdId}/finance/budget-progress`, {
            data: { cycle_start: cycleKey, item_key: `income_${mikeInc.id}_2801`, is_paid: 1, actual_amount: 9500 },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Savings & Investments
        // Joint Savings with Pots
        const savRes = await request.post(`/api/households/${householdId}/finance/savings`, { 
            data: { institution: "Ally", account_name: "Joint Savings", current_balance: 55000 },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const sav = await savRes.json();
        
        const potDefs = [
            { name: "Emergency Fund", target_amount: 30000, current_amount: 30000, emoji: "🚨", deposit_day: 1 },
            { name: "Hawaii 2026", target_amount: 15000, current_amount: 10000, emoji: "🌋", deposit_day: 1 },
            { name: "House Repairs", target_amount: 10000, current_amount: 5000, emoji: "🔨", deposit_day: 15 },
            { name: "Car Replacement", target_amount: 20000, current_amount: 10000, emoji: "🚗", deposit_day: 5 }
        ];
        for (const p of potDefs) {
            await request.post(`/api/households/${householdId}/finance/savings/${sav.id}/pots`, {
                data: p,
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        }

        // Individual Savings
        await request.post(`/api/households/${householdId}/finance/savings`, { 
            data: { institution: "Marcus", account_name: "Carol's Personal", current_balance: 12500 },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Investments & Pensions
        await request.post(`/api/households/${householdId}/finance/investments`, {
            data: { name: "Vanguard ETF", platform: "Vanguard", current_value: 152000, monthly_contribution: 500, payment_day: 2 },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        await request.post(`/api/households/${householdId}/finance/pensions`, {
            data: { provider: "Fidelity", plan_name: "401k", current_value: 420000, monthly_contribution: 1200, payment_day: 1 },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // DEBT
        // Mortgage
        const mortRes = await request.post(`/api/households/${householdId}/finance/mortgages`, {
            data: {
                lender: "Nationwide", total_amount: 500000, remaining_balance: 425000, 
                interest_rate: 3.49, monthly_payment: 1850, payment_day: 1, emoji: "🏠", asset_id: "primary",
                term_years: 25, repayment_type: "Repayment"
            },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const mort = await mortRes.json();
        await request.post(`/api/households/${householdId}/finance/assignments`, { data: { entity_type: 'finance_mortgages', entity_id: mort.id, member_id: members.Mike }, headers: { 'Authorization': `Bearer ${authToken}` } });
        await request.post(`/api/households/${householdId}/finance/assignments`, { data: { entity_type: 'finance_mortgages', entity_id: mort.id, member_id: members.Carol }, headers: { 'Authorization': `Bearer ${authToken}` } });

        // Personal Loan
        const loanRes = await request.post(`/api/households/${householdId}/finance/loans`, {
            data: {
                lender: "Barclays", loan_type: "Personal Improvement", total_amount: 25000, 
                remaining_balance: 12000, monthly_payment: 450, payment_day: 15, emoji: "📝",
                start_date: "2023-01-15"
            },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const loan = await loanRes.json();
        await request.post(`/api/households/${householdId}/finance/assignments`, { data: { entity_type: 'loan', entity_id: loan.id, member_id: members.Mike }, headers: { 'Authorization': `Bearer ${authToken}` } });

        // Car Finance (Tesla)
        const carFinRes = await request.post(`/api/households/${householdId}/finance/vehicle-finance`, {
            data: {
                provider: "Tesla Financial Services", total_amount: 60000, remaining_balance: 35000,
                interest_rate: 4.9, monthly_payment: 850, payment_day: 7, emoji: "⚡", vehicle_id: vehicleIds.Tesla,
                start_date: "2024-01-07", end_date: "2028-01-07"
            },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const carFin = await carFinRes.json();
        await request.post(`/api/households/${householdId}/finance/assignments`, { data: { entity_type: 'vehicle_finance', entity_id: carFin.id, member_id: members.Mike }, headers: { 'Authorization': `Bearer ${authToken}` } });

        // Credit Cards
        const amexRes = await request.post(`/api/households/${householdId}/finance/credit-cards`, {
            data: { provider: "American Express", card_name: "Platinum", credit_limit: 25000, current_balance: 4200, apr: 22.9, payment_day: 20, emoji: "💳" },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const amex = await amexRes.json();
        await request.post(`/api/households/${householdId}/finance/assignments`, { data: { entity_type: 'credit_card', entity_id: amex.id, member_id: members.Mike }, headers: { 'Authorization': `Bearer ${authToken}` } });

        const visaRes = await request.post(`/api/households/${householdId}/finance/credit-cards`, {
            data: { provider: "Chase", card_name: "Sapphire Reserve", credit_limit: 15000, current_balance: 1500, apr: 19.9, payment_day: 5, emoji: "💳" },
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const visa = await visaRes.json();
        await request.post(`/api/households/${householdId}/finance/assignments`, { data: { entity_type: 'credit_card', entity_id: visa.id, member_id: members.Carol }, headers: { 'Authorization': `Bearer ${authToken}` } });


        // Meals
        for (const r of recipes) { 
            await request.post(`/api/households/${householdId}/meals`, {
                data: { name: r.n, emoji: r.e, category: r.t },
                headers: { 'Authorization': `Bearer ${authToken}` }
            }); 
        } 

        console.log("✅ E2E SEED COMPLETE");
    });

    // -----------------------------------------------------------------------------------------
    // CLEANUP (afterAll)
    // -----------------------------------------------------------------------------------------
    test.afterAll(async ({ request }) => {
        console.log(`🧹 MAINTENANCE: Keeping household ${householdId} for demos.`);
        
        // Find other "Brady Bunch (E2E)" households to clean up to avoid accumulation
        try {
            // Need admin token or just search user's households if they own them all
            // Using the current authToken which belongs to the newly created admin of this household.
            // But this admin only sees THIS household. 
            // We need to login as a super-admin or rely on the shared email "mbryantuk@gmail.com" if they are linked.
            // The best way in this context without a super-admin key is difficult.
            // However, the test script runs with a fresh user each time (mike.brady.RUN_ID).
            // So we can't clean up OLD users' households easily unless we use a master key or global DB access.
            // BUT, the requirement is "only keep the latest version".
            // If we can't access old ones via API, we might need to rely on the nightly tidy script.
            
            // Wait, the prompt implies "make sure we only keep the latest version so we can use it for demos".
            // If I leave it in the DB, it persists. 
            // If I run this test 10 times, I have 10 households.
            // Since I cannot delete *other* households via this specific user's token (isolation),
            // I will assume the "Nightly Tidy" or "Cleanup Test Data" script handles the bulk cleanup,
            // OR I can try to use a known "Cleanup User" if available.
            
            // Alternative: The user `mbryantuk@gmail.com` is added as admin. 
            // If I log in as `mbryantuk@gmail.com`, I can see ALL households where he is a member.
            // If he is a member of all previous E2E runs, I can list them and delete the old ones.
            
            // Let's try to login as mbryantuk@gmail.com
            const cleanupLogin = await request.post('/api/auth/login', {
                data: { email: PRIMARY_USER, password: PASSWORD }
            });
            
            if (cleanupLogin.ok()) {
                const cleanupData = await cleanupLogin.json();
                const cleanupToken = cleanupData.token;
                
                const myHouseholdsRes = await request.get('/api/auth/my-households', {
                    headers: { 'Authorization': `Bearer ${cleanupToken}` }
                });
                
                if (myHouseholdsRes.ok()) {
                    const allHouseholds = await myHouseholdsRes.json();
                    
                    // Filter for Brady Bunch E2E households EXCEPT the current one
                    const toDelete = allHouseholds.filter(h => 
                        h.name.includes('The Brady Bunch (E2E)') && 
                        h.id !== householdId
                    );
                    
                    console.log(`Found ${toDelete.length} old E2E households to clean up.`);
                    
                    for (const h of toDelete) {
                        console.log(`Deleting old E2E household: ${h.name} (${h.id})`);
                        await request.delete(`/api/households/${h.id}`, {
                            headers: { 'Authorization': `Bearer ${cleanupToken}` }
                        });
                    }
                }
            } else {
                console.warn("Could not log in as cleanup user (mbryantuk). Old E2E households may persist.");
            }

        } catch (e) {
            console.error("Error during cleanup:", e);
        }
    });

    // -----------------------------------------------------------------------------------------
    // UI VERIFICATION STEPS
    // -----------------------------------------------------------------------------------------

    test.beforeEach(async ({ page }) => {
        // Log in before each test
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        
        await page.waitForLoadState('networkidle');
        
        // Handle household selector if it appears
        if (await page.locator('text=Select Household').isVisible()) {
             // We can use the text from the variable, but purely checking "Brady" is usually enough
             // or matching the exact name.
             await page.click('div[role="button"]:has-text("Brady Bunch")'); 
        }
    });

    test('Dashboard & House Details', async ({ page }) => {
        await test.step('Verify Valuation', async () => {
             await expect(page.getByText('£2,450,000')).toBeVisible();
        });
        
        await test.step('Verify Address/Property Type', async () => {
            await page.click('a[href*="/house"]'); // Navigate to house hub
            await expect(page.getByText('Brady Residence')).toBeVisible();
            await expect(page.getByText('Spectrum')).toBeVisible();
        });
    });

    test('Members & Pets', async ({ page }) => {
        await page.click('a[href*="/house"]');
        
        await test.step('Verify Member Count', async () => {
             await expect(page.getByText('Mike')).toBeVisible();
             await expect(page.getByText('Tiger')).toBeVisible();
             await expect(page.getByText('Fluffy')).toBeVisible();
        });

        await test.step('Verify Pet Emoji', async () => {
            await expect(page.locator('text=🐕')).toBeVisible();
        });
    });

    test('Assets & Vehicles', async ({ page }) => {
        await page.click('a[href*="/house"]');

        await test.step('Verify Assets', async () => {
            await expect(page.getByText('Samsung 65" TV')).toBeVisible();
            await expect(page.getByText('Piano')).toBeVisible();
        });

        await test.step('Verify Vehicles', async () => {
            await expect(page.getByText('Tesla Model S')).toBeVisible();
            await expect(page.getByText('Rivian R1S')).toBeVisible();
        });
    });

    test('Finance Dashboard', async ({ page }) => {
        await page.click('a[href="/finance"]');

        await test.step('Verify Wealth or Burn', async () => {
            // Verify presence of large numbers
            await expect(page.locator('body')).toContainText(/2,450,000|2.45M/);
        });
    });

    test('Budget Cycle', async ({ page }) => {
        await page.goto('/finance/budget'); // Direct nav or click

        await test.step('Verify Cycle Start', async () => {
            await expect(page.getByText('Jan 28')).toBeVisible();
        });

        await test.step('Verify Mikes Income Paid', async () => {
             const incomeRow = page.locator('tr', { hasText: 'Brady Architecture' });
             await expect(incomeRow).toBeVisible();
        });
    });
});