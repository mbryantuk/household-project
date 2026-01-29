import { test, expect } from '@playwright/test';

test.describe('Mega House Scenario Creation', () => {
  test('Create Mega House Configuration via UI', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    const uniqueId = Date.now();
    const email = `mega_${uniqueId}@test.com`;
    const password = 'Password123!';
    const householdName = `Mega House ${uniqueId}`;

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
    console.log(`Step 1: Registering Admin ${email}`);
    await page.route('**/api/auth/register', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        postData.is_test = 1; 
        await route.continue({ postData });
    });

    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Matt');
    await page.fill('input[name="lastName"]', 'Bryant');
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
    console.log(`   - Current URL: ${url}`);
    
    const match = url.match(/household\/(\d+)/);
    const hhId = match ? match[1] : null;
    
    if (!hhId) {
        throw new Error(`Failed to extract Household ID from URL: ${url}`);
    }
    
    console.log(`Step 3: Mega House Created (ID: ${hhId})`);

    // ==========================================
    // 2. HOUSEHOLD HUB (Members & Vehicles)
    // ==========================================
    console.log('Step 4: Adding Family Members');

    const addMember = async (firstName, type) => {
        console.log(`   - [${firstName}] Navigating to House Hub...`);
        await page.goto(`/household/${hhId}/house`);
        
        const btnText = type === 'adult' ? 'Add Adult' : (type === 'child' ? 'Add Child' : 'Add Pet');
        console.log(`   - [${firstName}] Clicking "${btnText}"...`);
        await page.click(`button:has-text("${btnText}")`);
        
        console.log(`   - [${firstName}] Waiting for Create URL...`);
        // Pets URL might not have query params, handle both cases
        await page.waitForURL(/.*\/new/, { timeout: 10000 });
        
        console.log(`   - [${firstName}] Filling form...`);
        // The form fields depend on the view logic. Based on previous analysis:
        // PeopleView uses first_name/last_name for new persons.
        if (type !== 'pet') {
             await page.fill('input[name="first_name"]', firstName);
             await page.fill('input[name="last_name"]', 'Doe');
        } else {
             await page.fill('input[name="name"]', firstName);
             await page.fill('input[name="species"]', 'Dog'); 
        }

        console.log(`   - [${firstName}] Clicking Create Button...`);
        const submitBtnText = type === 'pet' ? 'Create Pet' : 'Create Person';
        await page.click(`button:has-text("${submitBtnText}")`); 
        
        // Revised Expectation: Redirects to Household Hub
        console.log(`   - [${firstName}] Waiting for redirect to Hub...`);
        await page.waitForURL(new RegExp(`/household/${hhId}/house`), { timeout: 15000 });
        
        console.log(`   - [${firstName}] Verifying visibility...`);
        await expect(page.locator('h2')).toContainText('Household Hub');
        await expect(page.locator(`text=${firstName}`)).toBeVisible();
        console.log(`   - [${firstName}] Success!`);
    };

    await addMember('Matt', 'adult');
    await addMember('Jane', 'adult');
    await addMember('Timmy', 'child');
    await addMember('Sally', 'child');
    await addMember('Billy', 'child');
    
    // Pets
    console.log('Step 5: Adding Pets');
    await addMember('Rover', 'pet');
    
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
        
        // Revised Expectation: Redirects to Household Hub
        console.log(`   - Waiting for redirect to Hub`);
        await page.waitForURL(new RegExp(`/household/${hhId}/house`));
        await expect(page.locator('h2').first()).toContainText('Household Hub');
        await expect(page.locator(`text=${make} ${model}`)).toBeVisible();
        console.log(`   - Verified ${make} ${model} visible`);
    };

    await addVehicle('BMW', 'X5', 'BMW 123');
    await addVehicle('Tesla', 'Model Y', 'TSLA 456');

    // ==========================================
    // 3. PROPERTY
    // ==========================================
    console.log('Step 7: Adding Family Home Asset');
    await page.goto(`/household/${hhId}/house`);
    // Navigate to Assets tab
    await page.click('text=Manage Property & Assets');
    await page.click('button[role="tab"]:has-text("Assets")');
    console.log(`   - Opening Add Asset Modal`);
    await page.click('button:has-text("Add Asset")');
    await page.fill('input[name="name"]', 'Family Home');
    // Select Property category
    await page.click('label:has-text("Category") + div button');
    await page.click('li[role="option"]:has-text("Property")');
    await page.fill('input[name="purchase_value"]', '800000');
    console.log(`   - Saving Asset`);
    await page.click('button:has-text("Save Asset")');
    
    // Revised Expectation: Navigates back to Assets list
    console.log(`   - Verifying return to list`);
    await expect(page.locator('text=Appliance & Asset Register')).toBeVisible();
    await expect(page.locator('text=Family Home')).toBeVisible();

    // ==========================================
    // 4. FINANCE
    // ==========================================
    console.log('Step 8: Setting up Finances');
    
    // Joint Account
    console.log('   - 8.1 Adding Joint Bank Account');
    await page.goto(`/household/${hhId}/finance?tab=banking`);
    await page.click('button:has-text("Add Account")');
    await page.fill('input[name="bank_name"]', 'Barclays');
    await page.fill('input[name="account_name"]', 'Joint Account');
    await page.fill('input[name="current_balance"]', '5000');
    await page.click('button:has-text("Save Account")');
    // Expectation: Modal closes, item visible in list
    // Use more specific locator or check that the Add Account dialog is gone
    await expect(page.getByRole('dialog', { name: 'Add Bank Account' })).not.toBeVisible();
    await expect(page.locator('text=Joint Account')).toBeVisible();

    // Incomes
    console.log('   - 8.2 Adding Income Sources');
    await page.goto(`/household/${hhId}/finance?tab=income`);

    const addIncome = async (employer, amount, personName) => {
        console.log(`      - Adding Income: ${employer} for ${personName}`);
        await page.click('button:has-text("Add Income")');
        await page.fill('input[name="employer"]', employer);
        await page.fill('input[name="amount"]', amount);
        await page.fill('input[name="payment_day"]', '25');
        
        // Assign
        console.log(`      - [${personName}] Selecting person...`);
        const trigger = page.getByRole('combobox', { name: /Assigned Person/i });
        
        try {
            console.log(`      - [${personName}] Attempting click on combobox...`);
            await trigger.click({ timeout: 5000 });
        } catch (e) {
            console.log(`      - [${personName}] Standard click failed, trying placeholder/sibling...`);
            await page.locator('label:has-text("Assigned Person") + div button, button:has-text("Select Person...")').first().click({ force: true });
        }
        
        // Wait for dropdown options
        console.log(`      - [${personName}] Waiting for listbox options...`);
        const listbox = page.getByRole('listbox');
        await expect(listbox).toBeVisible({ timeout: 5000 });
        
        const optionsText = await listbox.innerText();
        console.log(`      - [${personName}] Listbox options: ${optionsText.replace(/\n/g, ', ')}`);
        
        // Click the option
        console.log(`      - [${personName}] Clicking option for ${personName}`);
        const option = page.getByRole('option').filter({ hasText: new RegExp(personName, 'i') }).first();
        
        // Use a more aggressive click strategy
        await option.click({ force: true });
        
        // Verify listbox is gone (meaning selection worked)
        console.log(`      - [${personName}] Waiting for listbox to close...`);
        await expect(listbox).not.toBeVisible({ timeout: 5000 });
        
        console.log(`      - [${personName}] Saving Income...`);
        await page.click('button:has-text("Save Income")');
        // Expectation: Modal closes, item visible in list
        console.log(`      - Waiting for modal to close`);
        await expect(page.getByRole('dialog', { name: 'Add Income Source' })).not.toBeVisible();
        await expect(page.locator(`text=${employer}`).first()).toBeVisible();
        console.log(`      - Verified Income: ${employer}`);
    };

    await addIncome('Tech Corp', '4500', 'Matt'); // Admin
    await addIncome('Law Firm', '5200', 'Jane'); // Created Member

    // Mortgage
    console.log('   - 8.3 Adding Mortgage');
    await page.goto(`/household/${hhId}/finance?tab=mortgage`);
    await page.click('button:has-text("Add New")'); 
    await page.click('li[role="menuitem"]:has-text("Add Mortgage")');
    
    // Property Link
    await page.click('label:has-text("Linked Property") + div button');
    await page.click('li[role="option"]:has-text("Family Home")');
    
    await page.fill('input[name="lender"]', 'HSBC');
    await page.fill('input[name="total_amount"]', '500000');
    await page.fill('input[name="remaining_balance"]', '450000');
    await page.fill('input[name="monthly_payment"]', '2200');
    await page.fill('input[name="interest_rate"]', '4.5');
    await page.fill('input[name="term_years"]', '25');
    await page.fill('input[name="payment_day"]', '1');
    
    // Assignments (Chips)
    console.log('      - Assigning to Matt & Jane');
    await page.click('div:has-text("Matt")');
    await page.click('div:has-text("Jane")');
    
    await page.click('button:has-text("Save Mortgage Details")');
    // Expectation: Modal closes, item visible
    await expect(page.getByRole('dialog', { name: 'Add Mortgage' })).not.toBeVisible();
    await expect(page.locator('text=HSBC')).toBeVisible();

    // Pensions
    console.log('   - 8.4 Adding Pension');
    await page.goto(`/household/${hhId}/finance?tab=pensions`);
    console.log('      - Opening Add Pension Modal');
    await page.click('button:has-text("Add Pension")');
    await page.fill('input[name="provider"]', 'Hargreaves Lansdown');
    await page.fill('input[name="plan_name"]', 'SIPP');
    await page.fill('input[name="current_value"]', '150000');
    await page.fill('input[name="monthly_contribution"]', '500');
    await page.fill('input[name="payment_day"]', '1');
    console.log('      - Saving Pension');
    await page.click('button:has-text("Save Pension")');
    // Expectation: Modal closes
    console.log('      - Waiting for modal to close');
    await expect(page.getByRole('dialog', { name: 'Add Pension' })).not.toBeVisible();
    await expect(page.locator('text=Hargreaves Lansdown')).toBeVisible();
    console.log('      - Verified Pension visible');

    // Investments
    console.log('   - 8.5 Adding Investment');
    await page.goto(`/household/${hhId}/finance?tab=invest`);
    console.log('      - Opening Add Investment Modal');
    await page.click('button:has-text("Add Investment")');
    await page.fill('input[name="name"]', 'Vanguard Global');
    await page.fill('input[name="platform"]', 'Vanguard');
    await page.fill('input[name="current_value"]', '50000');
    console.log('      - Saving Investment');
    await page.click('button:has-text("Save Investment")');
    // Expectation: Modal closes
    console.log('      - Waiting for modal to close');
    await expect(page.getByRole('dialog', { name: 'New Investment' })).not.toBeVisible();
    await expect(page.locator('text=Vanguard Global')).toBeVisible();
    console.log('      - Verified Investment visible');

    console.log('Step 9: Mega House Scenario Complete');
  });
});
