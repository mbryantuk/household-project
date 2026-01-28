import { test, expect } from '@playwright/test';

test.describe('System Smoke & Comprehensive Test', () => {
  const uniqueId = Date.now();
  const email = `smoke_${uniqueId}@test.com`;
  const password = 'Password123!';
  const householdName = `Smoke House ${uniqueId}`;

  test('Registration, Navigation, Asset CRUD, Finance Integration, and Meal Planning', async ({ page }) => {
    // Enable Console Logging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // ==========================================
    // 0. INTERCEPT REGISTRATION (Force is_test)
    // ==========================================
    await page.route('**/api/auth/register', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        postData.is_test = 1; 
        await route.continue({ postData });
    });

    // ==========================================
    // 1. REGISTRATION
    // ==========================================
    console.log(`Step 1: Registering ${email}`);
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Smoke');
    await page.fill('input[name="lastName"]', 'Bot');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });

    // ==========================================
    // 2. LOGIN
    // ==========================================
    console.log('Step 2: Logging in');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|.*select-household/, { timeout: 20000 });
    if (page.url().includes('/select-household')) {
        await page.click(`text=${householdName}`);
        await page.waitForURL(/.*dashboard/, { timeout: 15000 });
    }
    await expect(page.locator('text=Here\'s what\'s happening')).toBeVisible({ timeout: 15000 });
    
    const currentUrl = page.url();
    const hhMatch = currentUrl.match(/\/household\/(\d+)/);
    const hhId = hhMatch ? hhMatch[1] : null;
    if (!hhId) throw new Error("Failed to detect household ID");
    console.log(`Dashboard loaded. Household ID: ${hhId}`);

    // ==========================================
    // 3. ASSET MANAGEMENT (CRUD & Types)
    // ==========================================
    console.log('Step 3: Testing Asset Management');
    await page.goto(`/household/${hhId}/house`); 
    
    // Click the Assets tab
    await expect(page.locator('text=Household Identity')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Assets")');
    await expect(page.locator('text=Appliance & Asset Register')).toBeVisible({ timeout: 10000 });

    const assetTypes = [
        { name: 'Test Fridge', category: 'Appliance', value: '500', location: 'Kitchen' },
        { name: 'Test TV', category: 'Electronics', value: '1200', location: 'Living Room' },
        { name: 'Test Sofa', category: 'Furniture', value: '800', location: 'Living Room' },
        { name: 'Test Drill', category: 'Tool', value: '150', location: 'Garage' },
        { name: 'Rental Property', category: 'Property', value: '250000', location: 'Downtown' }
    ];

    // CREATE LOOP
    for (const asset of assetTypes) {
        console.log(`  Adding asset: ${asset.name}`);
        await page.click('button:has-text("Add Asset")');
        await expect(page.locator('text=New Asset')).toBeVisible();

        await page.fill('input[name="name"]', asset.name);
        
        // Select Category
        const categoryTrigger = page.locator('#asset-form button').filter({ hasText: 'Appliance' }).first();
        if (await categoryTrigger.isVisible()) {
             await categoryTrigger.click();
        } else {
             await page.locator('label:has-text("Category") + button').click(); 
        }
        await page.click(`[role="option"]:has-text("${asset.category}")`);

        await page.fill('input[name="location"]', asset.location);
        await page.fill('input[name="purchase_value"]', asset.value);

        await page.click('button:has-text("Save Asset")');
        await expect(page.locator(`tr:has-text("${asset.name}")`)).toBeVisible();
    }
    console.log('  All assets added successfully.');

    // UPDATE TEST
    console.log('  Testing Asset Update...');
    const assetToUpdate = assetTypes[0]; // Test Fridge
    const newName = 'Updated Fridge';
    const newValue = '600';

    const row = page.locator(`tr:has-text("${assetToUpdate.name}")`);
    await row.locator('button[aria-label="Edit"]').click();

    await expect(page.getByRole('heading', { name: 'Test Fridge' })).toBeVisible(); 
    await page.fill('#asset-form input[name="name"]', newName);
    await page.fill('#asset-form input[name="purchase_value"]', newValue);
    await page.click('button:has-text("Save Asset")');
    
    await expect(page.locator(`tr:has-text("${newName}")`)).toBeVisible();
    await expect(page.locator(`tr:has-text("${assetToUpdate.name}")`)).not.toBeVisible();
    console.log('  Asset Update verified.');

    // DELETE TEST
    console.log('  Testing Asset Delete...');
    const assetToDelete = assetTypes[1]; // Test TV
    
    // Setup dialog listener BEFORE clicking
    page.once('dialog', async dialog => {
        console.log(`  Dialog message: ${dialog.message()}`);
        await dialog.accept();
    });

    const deleteRow = page.locator(`tr:has-text("${assetToDelete.name}")`);
    await deleteRow.locator('button[aria-label="Delete"]').click();
    
    await expect(page.locator(`tr:has-text("${assetToDelete.name}")`)).not.toBeVisible();
    console.log('  Asset Delete verified.');


    // ==========================================
    // 4. FINANCIAL CHECK (Integration)
    // ==========================================
    console.log('Step 4: Verifying Financial Integration');
    const financeTabs = ['budget', 'income', 'banking', 'savings', 'invest', 'pensions', 'credit', 'loans', 'mortgage', 'car'];
    for (const tab of financeTabs) {
        await page.goto(`/household/${hhId}/finance?tab=${tab}`);
        await expect(page.locator('body')).not.toContainText('Error');
        await expect(page.locator('.MuiCircularProgress-root')).not.toBeVisible({ timeout: 5000 });
    }
    console.log('  Financial pages verified.');

    // ==========================================
    // 5. MEAL PLANNING
    // ==========================================
    console.log('Step 5: Meal Planning CRUD');
    await page.goto(`/household/${hhId}/meals`);
    
    // 1. Library Create
    await page.click('button:has-text("Library")');
    await expect(page.locator('text=Meal Library')).toBeVisible();

    const mealName = `Integration Pasta ${uniqueId}`;
    await page.fill('input[name="name"]', mealName);
    await page.fill('input[name="description"]', 'Test Description');
    await page.click('button:has-text("Create")');
    await expect(page.locator(`text=${mealName}`)).toBeVisible();
    
    // 2. Library Edit
    console.log('  Testing Meal Edit...');
    // Find the item container (Sheet) that contains the text
    // The structure is Sheet -> Box -> ... -> IconButton
    // We target the container that has the text, then find the edit button inside it.
    // Locator: div (Sheet) which contains text mealName
    const mealItem = page.locator(`div.MuiSheet-root:has-text("${mealName}")`).first(); 
    await mealItem.locator('button[aria-label="Edit"]').click();

    // Verify Edit Mode (Input should have value)
    await expect(page.locator('input[name="name"]')).toHaveValue(mealName);
    await page.fill('input[name="name"]', `${mealName} Edited`);
    await page.click('button:has-text("Update")'); // Button text changes to Update
    
    await expect(page.locator(`text=${mealName} Edited`)).toBeVisible();
    console.log('  Meal Edit verified.');

    // 3. Library Delete
    console.log('  Testing Meal Delete...');
    page.once('dialog', async dialog => {
        console.log(`  Dialog message: ${dialog.message()}`);
        await dialog.accept();
    });

    const mealToDelete = page.locator(`div.MuiSheet-root:has-text("${mealName} Edited")`).first();
    await mealToDelete.locator('button[aria-label="Delete"]').click();
    
    await expect(page.locator(`text=${mealName} Edited`)).not.toBeVisible();
    console.log('  Meal Delete verified.');
    
    console.log('  Meal Planning verified.');
  });
});
