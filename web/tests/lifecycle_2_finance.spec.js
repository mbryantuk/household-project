import { test, expect } from '@playwright/test';
import { logStep, withTimeout } from './utils/testLogger.js';
import fs from 'fs';

test.describe('Brady Lifecycle Stage 2: Finance & Fringe', () => {
  let context;
  
  test.beforeAll(() => {
    const data = fs.readFileSync('/tmp/brady_context.json', 'utf8');
    context = JSON.parse(data);
  });

  test('Expand Brady Household Finance', async ({ page }) => {
    test.setTimeout(300000); // 5 mins
    const { hhId, adminEmail, password } = context;
    
    // Login UI
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/household/${hhId}/dashboard`));
    
    // Extract Token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (!token) throw new Error("No token found in localStorage");

    // API Helper with Auth
    const request = page.context().request;
    const api = {
        get: (url) => request.get(url, { headers: { 'Authorization': `Bearer ${token}` } }),
        post: (url, opts) => request.post(url, { ...opts, headers: { ...opts?.headers, 'Authorization': `Bearer ${token}` } }),
        put: (url, opts) => request.put(url, { ...opts, headers: { ...opts?.headers, 'Authorization': `Bearer ${token}` } }),
        delete: (url, opts) => request.delete(url, { ...opts, headers: { ...opts?.headers, 'Authorization': `Bearer ${token}` } })
    };

    // Fetch Members for linking
    const membersRes = await api.get(`/api/households/${hhId}/members`);
    const members = await membersRes.json();
    const mike = members.find(m => m.name.includes('Mike'));
    const carol = members.find(m => m.name.includes('Carol'));

    await withTimeout('Finance: Income & Banking (API)', async () => {
        // 1. Bank Account
        await api.post(`/api/households/${hhId}/finance/current-accounts`, {
            data: {
                bank_name: 'First National',
                account_name: 'Family Checking',
                current_balance: 4500.50,
                is_test: 1
            }
        });

        // 2. Mike's Income
        if (mike) {
            await api.post(`/api/households/${hhId}/finance/income`, {
                data: {
                    employer: 'Architectural Assoc',
                    amount: 8500,
                    payment_day: 1,
                    member_id: mike.id,
                    is_test: 1
                }
            });
        }

        // 3. Carol's Income
        if (carol) {
            await api.post(`/api/households/${hhId}/finance/income`, {
                data: {
                    employer: 'Freelance Writing',
                    amount: 1200,
                    payment_day: 15,
                    member_id: carol.id,
                    is_test: 1
                }
            });
        }
    });

    await withTimeout('Finance: Savings & Assets (API)', async () => {
         // Savings
         await api.post(`/api/households/${hhId}/finance/savings`, {
            data: { institution: 'Chase', account_name: 'Rainy Day', current_balance: 12000, interest_rate: 4.5, is_test: 1 }
         });
         await api.post(`/api/households/${hhId}/finance/savings`, {
            data: { institution: 'Vanguard', account_name: 'College Fund', current_balance: 5000, interest_rate: 5.0, is_test: 1 }
         });
         
         // Investments
         await api.post(`/api/households/${hhId}/finance/investments`, {
            data: { name: 'Tech Stocks Portfolio', current_value: 15000, is_test: 1 }
         });
         
         // Pensions
         await api.post(`/api/households/${hhId}/finance/pensions`, {
            data: { provider: 'Fidelity', current_value: 85000, monthly_contribution: 500, payment_day: 1, is_test: 1 }
         });
         
         // Mortgage
         await api.post(`/api/households/${hhId}/finance/mortgages`, {
            data: {
                lender: 'Big Bank Corp',
                total_amount: 500000,
                remaining_balance: 450000,
                monthly_payment: 2800,
                payment_day: 1,
                interest_rate: 3.5,
                term_years: 25,
                is_test: 1
            }
         });
         
         // Car Finance (Mike's Wagon)
         const vehiclesRes = await api.get(`/api/households/${hhId}/vehicles`);
         const vehicles = await vehiclesRes.json();
         const mikeCar = vehicles.find(v => v.model.includes('Kingswood'));
         
         if (mikeCar) {
             await api.post(`/api/households/${hhId}/finance/vehicle-finance`, {
                data: {
                    provider: 'GM Financial',
                    vehicle_id: mikeCar.id,
                    total_amount: 5000,
                    remaining_balance: 1200,
                    monthly_payment: 150,
                    payment_day: 5,
                    is_test: 1
                }
             });
         }
         
         // Credit Cards
         await api.post(`/api/households/${hhId}/finance/credit-cards`, {
            data: { card_name: 'Amex Gold', current_balance: 450, credit_limit: 10000, payment_day: 28, is_test: 1 }
         });
         await api.post(`/api/households/${hhId}/finance/credit-cards`, {
            data: { card_name: 'Chase Sapphire', current_balance: 120, credit_limit: 15000, payment_day: 14, is_test: 1 }
         });
    });

    await withTimeout('Finance: Utilities & Services', async () => {
        // 1. Council Tax
        await api.post(`/api/households/${hhId}/council`, {
            data: { authority_name: 'City Council', account_number: '12345678', monthly_amount: 180, payment_day: 1, band: 'D', notes: 'Council Tax 2026', is_test: 1 }
        });
        // 2. Water
        await api.post(`/api/households/${hhId}/water`, {
            data: { provider: 'Thames Water', account_number: '98765432', monthly_amount: 45, payment_day: 15, supply_type: 'metered', notes: 'Water Bill', is_test: 1 }
        });
        // 3. Energy
        await api.post(`/api/households/${hhId}/energy`, {
            data: { provider: 'Octopus Energy', account_number: '55667788', type: 'Dual', tariff_name: 'Flexible', monthly_amount: 220, payment_day: 20, notes: 'Gas & Electric', is_test: 1 }
        });
    });

    await withTimeout('Finance: Member & Vehicle Bills', async () => {
        // Members
        for (const m of members) {
             if (m.type === 'adult') {
                await api.post(`/api/households/${hhId}/finance/charges`, {
                    data: { name: 'Mobile Plan', amount: 25, segment: 'subscription', frequency: 'monthly', linked_entity_type: 'member', linked_entity_id: m.id, notes: 'Unlimited Data', is_test: 1 }
                });
             }
        }
        // Vehicles
        const vehiclesRes = await api.get(`/api/households/${hhId}/vehicles`);
        const vehicles = await vehiclesRes.json();
        for (const v of vehicles) {
            await api.post(`/api/households/${hhId}/finance/charges`, {
                data: { name: 'Vehicle Tax', amount: 15, segment: 'vehicle_tax', frequency: 'monthly', linked_entity_type: 'vehicle', linked_entity_id: v.id, is_test: 1 }
            });
            await api.post(`/api/households/${hhId}/vehicles/${v.id}/insurance`, {
                data: { provider: 'Direct Line', policy_number: 'POL123', premium: 450, frequency: 'annual', renewal_date: '2027-01-01', notes: 'Fully Comp', is_test: 1 }
            });
        }
    });

    await withTimeout('Operations: Meal Plans', async () => {
        // Create Meals
        const mealList = [
            { name: 'Spaghetti Bolognese', emoji: '🍝', category: 'Dinner' },
            { name: 'Chicken Curry', emoji: '🍛', category: 'Dinner' },
            { name: 'Roast Beef', emoji: '🍖', category: 'Dinner' },
            { name: 'Fish & Chips', emoji: '🐟', category: 'Dinner' },
            { name: 'Pizza Night', emoji: '🍕', category: 'Dinner' },
            { name: 'Tacos', emoji: '🌮', category: 'Dinner' },
            { name: 'Burger & Fries', emoji: '🍔', category: 'Dinner' }
        ];
        const createdMeals = [];
        for (const m of mealList) {
            const res = await api.post(`/api/households/${hhId}/meals`, { data: { ...m, is_test: 1 } });
            const json = await res.json();
            createdMeals.push(json.id);
        }
        
        // Assign for 90 days
        const eaters = members.filter(m => m.type !== 'pet').map(m => m.id);
        const startDate = new Date();
        for (let i = 0; i < 90; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const mealId = createdMeals[i % createdMeals.length];
            for (const memberId of eaters) {
                 await api.post(`/api/households/${hhId}/meal-plans`, {
                    data: { date: dateStr, member_id: memberId, meal_id: mealId, is_test: 1 }
                });
            }
        }
    });

    // Verification
    await page.goto(`/household/${hhId}/finance?tab=budget`);
    await expect(page.locator('text=Safe to Spend')).toBeVisible({ timeout: 30000 });
  });
});
