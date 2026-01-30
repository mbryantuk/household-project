import { test, expect } from '@playwright/test';

test.describe('Brady Test Scenario', () => {
  test('Create Brady Family Configuration via UI', async ({ page }) => {
    test.setTimeout(900000); // 15 minutes for this very large setup

    const uniqueId = Date.now();
    const email = `brady_${uniqueId}@test.com`;
    const password = 'Password123!';
    const householdName = `Brady Family ${uniqueId}`;

    // Debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`❌ API ERROR: ${response.url()} ${response.status()}`);
        }
    });

    // ==========================================
    // 1. REGISTRATION & LOGIN
    // ==========================================
    console.log(`Step 1: Registering Admin (Mike Brady) ${email}`);
    await page.route('**/api/auth/register', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        postData.is_test = 1; 
        await route.continue({ postData });
    });

    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Mike');
    await page.fill('input[name="lastName"]', 'Brady');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*login/, { timeout: 30000 });

    console.log('Step 2: Logging in');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for the full URL pattern including the ID
    await page.waitForURL(/\/household\/\d+\/dashboard/, { timeout: 30000 });
    
    const url = page.url();
    const match = url.match(/household\/(\d+)/);
    const hhId = match ? match[1] : null;
    
    if (!hhId) {
        throw new Error(`Failed to extract Household ID from URL: ${url}`);
    }
    
    console.log(`Step 3: Brady Household Created (ID: ${hhId})`);

    // ==========================================
    // 2. HOUSEHOLD HUB (Members & Vehicles)
    // ==========================================
    console.log('Step 4: Adding Family Members');

    const addMember = async (firstName, type, emoji = '👤', species = 'Dog') => {
        console.log(`   - [${firstName}] Navigating to House Hub...`);
        await page.goto(`/household/${hhId}/house`);
        
        const btnText = type === 'adult' ? 'Add Adult' : (type === 'child' ? 'Add Child' : 'Add Pet');
        console.log(`   - [${firstName}] Clicking "${btnText}"...`);
        await page.click(`button:has-text("${btnText}")`);
        
        console.log(`   - [${firstName}] Waiting for Create URL...`);
        await page.waitForURL(/.*\/new/, { timeout: 10000 });
        
        console.log(`   - [${firstName}] Filling form...`);
        if (type !== 'pet') {
             await page.fill('input[name="first_name"]', firstName);
             await page.fill('input[name="last_name"]', 'Brady');
             // Select type if not default
             if (type === 'child') {
                 await page.click('label:has-text("Role / Type") + div button');
                 await page.click('li[role="option"]:has-text("Child")');
             }
        } else {
             await page.fill('input[name="name"]', firstName);
             await page.fill('input[name="species"]', species); 
        }

        console.log(`   - [${firstName}] Clicking Create Button...`);
        const submitBtnText = type === 'pet' ? 'Create Pet' : 'Create Person';
        await page.click(`button:has-text("${submitBtnText}")`); 
        
        console.log(`   - [${firstName}] Waiting for redirect to Hub...`);
        await page.waitForURL(new RegExp(`/household/${hhId}/house`), { timeout: 15000 });
        
        console.log(`   - [${firstName}] Verifying visibility...`);
        await expect(page.locator('h2').first()).toContainText('Household Hub');
        await expect(page.locator(`text=${firstName}`)).toBeVisible();
        console.log(`   - [${firstName}] Success!`);
    };

    // Note: Mike is already created as Admin, but we need him as a 'Member' for assignments
    await addMember('Mike', 'adult');
    await addMember('Carol', 'adult');
    await addMember('Alice', 'adult');
    await addMember('Greg', 'child');
    await addMember('Marcia', 'child');
    await addMember('Peter', 'child');
    await addMember('Jan', 'child');
    await addMember('Bobby', 'child');
    await addMember('Cindy', 'child');
    
    console.log('Step 5: Adding Tiger (Pet)');
    await addMember('Tiger', 'pet', '🐶', 'Dog');
    
    // ==========================================
    // VEHICLES
    // ==========================================
    console.log('Step 6: Adding Vehicles');
    const addVehicle = async (make, model, reg) => {
        console.log(`   - Adding Vehicle: ${make} ${model}`);
        await page.goto(`/household/${hhId}/house`);
        await page.click('button:has-text("Add Vehicle")');
        await page.waitForURL(/.*vehicles\/new/);
        
        await page.fill('input[name="make"]', make);
        await page.fill('input[name="model"]', model);
        await page.fill('input[name="registration"]', reg);
        await page.click('button:has-text("Create Vehicle")');
        
        await page.waitForURL(new RegExp(`/household/${hhId}/house`));
        await expect(page.locator('h2').first()).toContainText('Household Hub');
        await expect(page.locator(`text=${make} ${model}`)).toBeVisible();
        console.log(`   - Verified ${make} ${model} visible`);
    };

    await addVehicle('Plymouth', 'Satellite Wagon', 'BRADY 1');
    await addVehicle('Chevrolet', 'Impana Wagon', 'BRADY 2');

    // ==========================================
    // 3. PROPERTY
    // ==========================================
    console.log('Step 7: Adding Brady Home Asset');
    await page.goto(`/household/${hhId}/house`);
    await page.click('text=Manage Property & Assets');
    await page.click('button[role="tab"]:has-text("Assets")');
    console.log(`   - Opening Add Asset Modal`);
    await page.click('button:has-text("Add Asset")');
    await page.fill('input[name="name"]', 'Brady Bunch House');
    await page.click('label:has-text("Category") + div button');
    await page.click('li[role="option"]:has-text("Property")');
    await page.fill('input[name="purchase_value"]', '1200000');
    console.log(`   - Saving Asset`);
    await page.click('button:has-text("Save Asset")');
    
    await expect(page.locator('text=Appliance & Asset Register')).toBeVisible();
    await expect(page.locator('text=Brady Bunch House')).toBeVisible();

    // ==========================================
    // 4. FINANCE
    // ==========================================
    console.log('Step 8: Setting up Finances');
    
    // 8.1 Joint Bank Account
    console.log('   - 8.1 Adding Joint Bank Account');
    await page.goto(`/household/${hhId}/finance?tab=banking`);
    await page.click('button:has-text("Add Account")');
    await page.fill('input[name="bank_name"]', 'First National');
    await page.fill('input[name="account_name"]', 'Joint Account');
    await page.fill('input[name="current_balance"]', '15000');
    await page.click('button:has-text("Save Account")');
    await expect(page.getByRole('dialog', { name: 'Add Bank Account' })).not.toBeVisible();
    await expect(page.locator('text=Joint Account')).toBeVisible();

    // 8.2 Incomes
    console.log('   - 8.2 Adding Income Sources');
    await page.goto(`/household/${hhId}/finance?tab=income`);

    const addIncome = async (employer, amount, personName) => {
        console.log(`      - Adding Income: ${employer} for ${personName}`);
        await page.click('button:has-text("Add Income")');
        await page.fill('input[name="employer"]', employer);
        await page.fill('input[name="amount"]', amount);
        await page.fill('input[name="payment_day"]', '25');
        
        console.log(`      - [${personName}] Selecting person...`);
        const trigger = page.locator('label:has-text("Assigned Person") + div button, button:has-text("Select Person...")').first();
        
        console.log(`      - [${personName}] Clicking dropdown trigger...`);
        await trigger.click({ force: true });
        
        console.log(`      - [${personName}] Waiting for listbox...`);
        await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
        
        console.log(`      - [${personName}] Clicking option...`);
        await page.getByRole('option').filter({ hasText: new RegExp(personName, 'i') }).first().click({ force: true });
        
        console.log(`      - [${personName}] Waiting for listbox to close...`);
        await expect(page.getByRole('listbox')).not.toBeVisible({ timeout: 5000 });
        
        console.log(`      - [${personName}] Saving Income...`);
        await page.click('button:has-text("Save Income")');
        await expect(page.getByRole('dialog', { name: 'Add Income Source' })).not.toBeVisible();
        await expect(page.locator(`text=${employer}`).first()).toBeVisible();
        console.log(`      - Verified Income: ${employer}`);
    };

    await addIncome('Architectural Firm', '8500', 'Mike');
    await addIncome('Freelance Writing', '2500', 'Carol');

    // 8.3 Mortgage
    console.log('   - 8.3 Adding Mortgage');
    await page.goto(`/household/${hhId}/finance?tab=mortgage`);
    await page.click('button:has-text("Add New")'); 
    await page.click('li[role="menuitem"]:has-text("Add Mortgage")');
    
    await page.click('label:has-text("Linked Property") + div button');
    await page.click('li[role="option"]:has-text("Brady Bunch House")');
    
    await page.fill('input[name="lender"]', 'Savings & Loan');
    await page.fill('input[name="total_amount"]', '800000');
    await page.fill('input[name="remaining_balance"]', '650000');
    await page.fill('input[name="monthly_payment"]', '4200');
    await page.fill('input[name="interest_rate"]', '3.5');
    await page.fill('input[name="term_years"]', '30');
    await page.fill('input[name="payment_day"]', '1');
    
    console.log('      - Assigning to Mike & Carol');
    await page.getByRole('button', { name: 'Mike', exact: false }).first().click();
    await page.getByRole('button', { name: 'Carol', exact: false }).first().click();
    
    await page.click('button:has-text("Save Mortgage Details")');
    await expect(page.getByRole('dialog', { name: 'Add Mortgage' })).not.toBeVisible();
    await expect(page.locator('text=Savings & Loan')).toBeVisible();

    // 8.4 Car Finance
    console.log('   - 8.4 Adding Car Finance');
    await page.goto(`/household/${hhId}/finance?tab=car`);
    console.log('      - Opening Add Car Finance Modal');
    await page.click('button:has-text("Add Agreement")');
    
    console.log('      - Selecting Vehicle');
    const vehicleTrigger = page.locator('label:has-text("Vehicle") + div button, button:has-text("Select Vehicle")').first();
    await vehicleTrigger.click({ force: true });
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
    await page.getByRole('option').filter({ hasText: /Plymouth/i }).first().click({ force: true });
    await expect(page.getByRole('listbox')).not.toBeVisible({ timeout: 5000 });
    
    await page.fill('input[name="provider"]', 'Plymouth Finance');
    await page.fill('input[name="total_amount"]', '25000');
    await page.fill('input[name="remaining_balance"]', '12000');
    await page.fill('input[name="monthly_payment"]', '450');
    await page.fill('input[name="payment_day"]', '15');
    
    console.log('      - Saving Car Finance');
    await page.click('button:has-text("Save")');
    await expect(page.getByRole('dialog', { name: 'Add Car Finance' })).not.toBeVisible();
    await expect(page.locator('text=Plymouth Finance')).toBeVisible();
    console.log('      - Verified Car Finance visible');

    // 8.5 Credit Cards
    console.log('   - 8.5 Adding Credit Cards');
    await page.goto(`/household/${hhId}/finance?tab=credit`);
    
    const addCreditCard = async (provider, cardName, limit, balance, personName) => {
        console.log(`      - Adding Credit Card: ${provider} ${cardName} for ${personName}`);
        await page.click('button:has-text("Add Card")');
        await page.fill('input[name="provider"]', provider);
        await page.fill('input[name="card_name"]', cardName);
        await page.fill('input[name="credit_limit"]', limit);
        await page.fill('input[name="current_balance"]', balance);
        await page.fill('input[name="payment_day"]', '20');
        
        console.log(`      - [${personName}] Selecting member...`);
        // Credit cards use Chip selection - use getByRole for better matching
        await page.getByRole('button', { name: personName, exact: false }).first().click(); 
        
        console.log(`      - [${personName}] Saving Credit Card`);
        await page.click('button:has-text("Save")');
        await expect(page.getByRole('dialog', { name: 'Add Card' })).not.toBeVisible();
        await expect(page.locator(`text=${cardName}`).first()).toBeVisible();
    };

    await addCreditCard('American Express', 'Gold', '50000', '2500', 'Mike');
    await addCreditCard('Visa', 'Platinum', '20000', '1200', 'Carol');

    // 8.6 Loans
    console.log('   - 8.6 Adding Personal Loan');
    await page.goto(`/household/${hhId}/finance?tab=loans`);
    console.log('      - Opening Add Loan Modal');
    await page.click('button:has-text("Add Loan")');
    await page.fill('input[name="lender"]', 'Family Bank');
    await page.fill('input[name="loan_type"]', 'Home Improvement');
    await page.fill('input[name="remaining_balance"]', '10000');
    await page.fill('input[name="monthly_payment"]', '300');
    console.log('      - Saving Loan');
    await page.click('button:has-text("Save")');
    await expect(page.getByRole('dialog', { name: 'New Loan' })).not.toBeVisible();
    await expect(page.locator('text=Family Bank')).toBeVisible();

    // 8.7 Pensions
    console.log('   - 8.7 Adding Pension');
    await page.goto(`/household/${hhId}/finance?tab=pensions`);
    console.log('      - Opening Add Pension Modal');
    await page.click('button:has-text("Add Pension")');
    await page.fill('input[name="provider"]', 'Architects Retirement');
    await page.fill('input[name="plan_name"]', 'Senior Partner Pension');
    await page.fill('input[name="current_value"]', '450000');
    await page.fill('input[name="monthly_contribution"]', '1200');
    await page.fill('input[name="payment_day"]', '1');
    console.log('      - Saving Pension');
    await page.click('button:has-text("Save")');
    await expect(page.getByRole('dialog', { name: 'Add Pension' })).not.toBeVisible();
    await expect(page.locator('text=Architects Retirement')).toBeVisible();

    // 8.8 Investments
    console.log('   - 8.8 Adding Investment');
    await page.goto(`/household/${hhId}/finance?tab=invest`);
    console.log('      - Opening Add Investment Modal');
    await page.click('button:has-text("Add Investment")');
    await page.fill('input[name="name"]', 'Brady Stock Portfolio');
    await page.fill('input[name="platform"]', 'E-Trade');
    await page.fill('input[name="current_value"]', '75000');
    console.log('      - Saving Investment');
    await page.click('button:has-text("Save")');
    await expect(page.getByRole('dialog', { name: 'New Investment' })).not.toBeVisible();
    await expect(page.locator('text=Brady Stock Portfolio')).toBeVisible();

    console.log('Step 9: Brady Test Scenario Complete');
  });
});
