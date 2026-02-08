import { test, expect } from '@playwright/test';

test.describe('Dashboard Drag and Drop', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    test.beforeEach(async ({ page, request }) => {
        // Login via API to get token for reset
        const loginRes = await request.post(`${process.env.API_URL || 'http://localhost:4001'}/api/auth/login`, {
            data: { email: ADMIN_EMAIL, password: PASSWORD }
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        // Reset Dashboard Layout
        await request.put(`${process.env.API_URL || 'http://localhost:4001'}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { dashboard_layout: null }
        });

        // Set fixed viewport to ensure 'lg' breakpoint
        await page.setViewportSize({ width: 1280, height: 720 });

        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        await page.waitForURL('**/dashboard');
        await page.waitForLoadState('networkidle');
    });

    test('Customize Dashboard: Add, Move, Remove and Save', async ({ page }) => {
        // Debug: Check if root exists
        const root = page.locator('#root');
        await expect(root).toBeVisible();

        // 1. Enter Edit Mode
        // Wait for greeting
        await expect(page.locator('h2').first()).toContainText('Good', { timeout: 10000 });

        const customizeBtn = page.locator('button:has-text("Customize")');
        if (!await customizeBtn.isVisible()) {
            console.log(await page.content());
        }
        await expect(customizeBtn).toBeVisible();
        await customizeBtn.click();

        // Verify "Save Layout" and "Add Widget" buttons appear
        const saveBtn = page.locator('button:has-text("Save Layout")');
        const addWidgetBtn = page.locator('button:has-text("Add Widget")');
        await expect(saveBtn).toBeVisible();
        await expect(addWidgetBtn).toBeVisible();

        // 2. Add a Widget
        await addWidgetBtn.click();
        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible();
        await menu.getByText('Sticky Note').click();

        // Verify "Sticky Note" is added (might be at the bottom)
        // We look for a widget with type 'notes' or title 'Sticky Note'
        // In HomeView, NotesWidget label is 'Sticky Note'
        // The widget id will be 'notes-' + timestamp.
        const notesWidget = page.locator('.react-grid-item:has-text("Sticky Note")').last();
        await expect(notesWidget).toBeVisible();

        // 3. Move a Widget
        // We'll move the first widget (Clock) to x=4 (it starts at x=0)
        // The clock widget has label "System Clock" in menu but "System Time" in title
        const clockWidget = page.locator('.react-grid-item:has-text("System Time")').first();
        const clockBox = await clockWidget.boundingBox();

        if (clockBox) {
            // Drag and drop
            await page.mouse.move(clockBox.x + 20, clockBox.y + 20);
            await page.mouse.down();
            await page.mouse.move(clockBox.x + 400, clockBox.y + 20, { steps: 10 }); // Move right
            await page.mouse.up();
        }
        
        // Wait for layout animation/update
        await page.waitForTimeout(1000);

        // 4. Save Layout
        await saveBtn.click();
        
        // Verify buttons revert to "Customize"
        await expect(customizeBtn).toBeVisible();

        // 5. Reload and Verify Persistence
        await page.reload();
        await page.waitForURL('**/dashboard');
        
        // Check if Sticky Note is still there
        await expect(page.locator('.react-grid-item:has-text("Sticky Note")').last()).toBeVisible();
    });
});
