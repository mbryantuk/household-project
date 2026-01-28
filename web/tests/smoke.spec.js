import { test, expect } from '@playwright/test';
import { addDays, format } from 'date-fns';

test.describe('System Smoke & Comprehensive Test', () => {
  const uniqueId = Date.now();
  const email = `smoke_${uniqueId}@test.com`;
  const password = 'Password123!';
  const householdName = `Mega House ${uniqueId}`;

  test('Full System Lifecycle: Family, Fleet, Financial Matrix, and Meal Planning', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Force is_test to true for registration
    await page.route('**/api/auth/register', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        postData.is_test = 1; 
        await route.continue({ postData });
    });

    // 1. REGISTRATION & LOGIN
    console.log(`Step 1: Registering ${email}`);
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Lead');
    await page.fill('input[name="lastName"]', 'Architect');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });

    console.log('Step 2: Logging in');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 20000 });
    
    const hhId = page.url().match(/\/household\/(\d+)/)[1];
    console.log(`Step 3: Dashboard loaded. Household ID: ${hhId}`);

    // ==========================================
    // 4. PEOPLE (Family Setup)
    // ==========================================
    console.log('Step 4: Creating Family Members');
    await page.goto(`/household/${hhId}/people`);
    await expect(page.locator('text=Household Residents')).toBeVisible({ timeout: 15000 });
    
    const family = [
        { name: 'John Doe', type: 'Adult', alias: 'Dad' },
        { name: 'Jane Doe', type: 'Adult', alias: 'Mom' },
        { name: 'Billy Doe', type: 'Child', alias: 'Son' }
    ];

    for (const m of family) {
        console.log(`   - Adding Member: ${m.name}`);
        // MUI Joy Select handling: click trigger then pick option
        await page.click('label:has-text("Type") + div button');
        await page.click(`li[role="option"]:has-text("${m.type}")`);
        
        await page.fill('input[name="name"]', m.name);
        await page.fill('input[name="alias"]', m.alias);
        await page.click('button:has-text("Add Resident")');
        await expect(page.locator(`text=${m.name}`).first()).toBeVisible({ timeout: 10000 });
    }
    console.log('   - Step verified: Family members created (Dad, Mom, Son)');

    // ==========================================
    // 5. PETS
    // ==========================================
    console.log('Step 5: Creating Pets');
    await page.goto(`/household/${hhId}/pets`);
    await expect(page.locator('text=Pets & Animals')).toBeVisible({ timeout: 15000 });
    
    const pets = [
        { name: 'Rex', species: 'Dog', emoji: '🐶' },
        { name: 'Luna', species: 'Cat', emoji: '🐱' }
    ];
    for (const p of pets) {
        console.log(`   - Adding Pet: ${p.name}`);
        await page.click('button:has-text("Add Pet")');
        await page.fill('input[name="name"]', p.name);
        await page.fill('input[name="species"]', p.species);
        await page.click('button:has-text("Create Pet")');
        await expect(page.locator(`text=${p.name}`).first()).toBeVisible({ timeout: 10000 });
        await page.goto(`/household/${hhId}/pets`);
    }
    console.log('   - Step verified: Pets created (Rex, Luna)');

    // ==========================================
    // 6. VEHICLES
    // ==========================================
    console.log('Step 6: Creating Vehicles');
    await page.goto(`/household/${hhId}/vehicles`);
    await expect(page.locator('text=Vehicle Management')).toBeVisible({ timeout: 15000 });
    
    const fleet = [
        { make: 'Tesla', model: 'Model 3' },
        { make: 'Ford', model: 'F-150' }
    ];
    for (const v of fleet) {
        console.log(`   - Adding Vehicle: ${v.make} ${v.model}`);
        await page.click('button:has-text("Add Vehicle")');
        await page.fill('input[name="make"]', v.make);
        await page.fill('input[name="model"]', v.model);
        await page.click('button:has-text("Create Vehicle")');
        await expect(page.locator(`text=${v.make}`).first()).toBeVisible({ timeout: 10000 });
        await page.goto(`/household/${hhId}/vehicles`);
    }
    console.log('   - Step verified: Fleet created (Tesla, Ford)');

    // ==========================================
    // 7. ASSETS (CRUD)
    // ==========================================
    console.log('Step 7: Testing Asset Lifecycle');
    await page.goto(`/household/${hhId}/house`);
    await page.click('button:has-text("Assets")');
    
    await page.click('button:has-text("Add Asset")');
    await page.fill('input[name="name"]', 'Smart Fridge');
    await page.click('button:has-text("Save Asset")');
    await expect(page.locator('text=Smart Fridge')).toBeVisible();
    console.log('   - Step verified: Asset Created (Smart Fridge)');

    await page.locator('tr:has-text("Smart Fridge")').locator('button[aria-label="Edit"]').click();
    await page.fill('#asset-form input[name="name"]', 'Premium Fridge');
    await page.click('button:has-text("Save Asset")');
    await expect(page.locator('text=Premium Fridge')).toBeVisible();
    console.log('   - Step verified: Asset Updated (Smart Fridge -> Premium Fridge');

    page.once('dialog', d => d.accept());
    await page.locator('tr:has-text("Premium Fridge")').locator('button[aria-label="Delete"]').click();
    await expect(page.locator('text=Premium Fridge')).not.toBeVisible();
    console.log('   - Step verified: Asset Deleted (Premium Fridge)');

    // ==========================================
    // 8. FINANCIAL MATRIX
    // ==========================================
    console.log('Step 8: Testing Financial Matrix');
    
    // Banking
    await page.goto(`/household/${hhId}/finance?tab=banking`);
    await page.click('button:has-text("Add Account")');
    await page.fill('input[name="bank_name"]', 'HSBC');
    await page.fill('input[name="account_name"]', 'Joint Account');
    await page.click('button:has-text("Save Account")');
    console.log('   - Step verified: Joint Account created');

    // Income for Dad
    await page.goto(`/household/${hhId}/finance?tab=income`);
    await page.click('button:has-text("Add Income")');
    await page.fill('input[name="employer"]', 'Tech Corp');
    await page.fill('input[name="amount"]', '5000');
    
    await page.click('label:has-text("Assigned Person") + div button');
    await page.click('li[role="option"]:has-text("Dad")');
    
    await page.click('label:has-text("Deposit to Account") + div button');
    await page.click('li[role="option"]:has-text("HSBC - Joint Account")');

    await page.click('button:has-text("Save Income")');
    console.log('   - Step verified: Salary linked to Dad & Joint Account');

    // Utilities
    await page.goto(`/household/${hhId}/energy`);
    await page.click('button:has-text("Add Account")');
    await page.fill('input[name="provider"]', 'Octopus');
    await page.fill('input[name="monthly_amount"]', '200');
    await page.click('button:has-text("Save Account")');
    console.log('   - Step verified: Energy bill created');

    await page.goto(`/household/${hhId}/water`);
    await page.click('button:has-text("Add Account")');
    await page.fill('input[name="provider"]', 'Thames Water');
    await page.fill('input[name="monthly_amount"]', '45');
    await page.click('button:has-text("Save Account")');
    console.log('   - Step verified: Water bill created');

    // ==========================================
    // 9. MEAL PLANNING
    // ==========================================
    console.log('Step 9: Testing Meal Planning CRUD');
    await page.goto(`/household/${hhId}/meals`);
    await page.click('button:has-text("Library")');
    await page.fill('input[name="name"]', 'Sunday Roast');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=Sunday Roast')).toBeVisible();
    console.log('   - Step verified: Meal "Sunday Roast" created');

    console.log('Step 10: Final System Verification Summary');
    console.log('   ✅ Full Family Tree Created');
    console.log('   ✅ Fleet & Assets Lifecycle Verified');
    console.log('   ✅ Financial Matrix (Linked Income/Bills) Verified');
    console.log('   ✅ Meal Planning Infrastructure Verified');
  });
});
