const request = require('supertest');
const { app, server } = require('../../server');
const { globalDb } = require('../../db');

describe('🛡️ Comprehensive SaaS RBAC & CRUD Lifecycle', () => {
    jest.setTimeout(90000); // Increased timeout for larger suite
    
    const uniqueId = Date.now();
    const emails = {
        admin: `comp_admin_${uniqueId}@test.com`,
        member: `comp_member_${uniqueId}@test.com`,
        viewer: `comp_viewer_${uniqueId}@test.com`,
        outsider: `comp_outsider_${uniqueId}@test.com`
    };
    
    const tokens = { admin: '', member: '', viewer: '', outsider: '' };
    let householdId = null;
    let otherHouseholdId = null;

    beforeAll(async () => {
        // 1. Setup Main Household & Admin
        await request(app).post('/auth/register').send({
            householdName: 'Comp Test House', email: emails.admin, password: 'Password123!', firstName: 'Admin'
        });
        const lAdmin = await request(app).post('/auth/login').send({ email: emails.admin, password: 'Password123!' });
        tokens.admin = lAdmin.body.token;
        householdId = lAdmin.body.household.id;

        // 2. Add Member and Viewer
        await request(app).post(`/households/${householdId}/users`).set('Authorization', `Bearer ${tokens.admin}`).send({ email: emails.member, role: 'member', password: 'Password123!' });
        await request(app).post(`/households/${householdId}/users`).set('Authorization', `Bearer ${tokens.admin}`).send({ email: emails.viewer, role: 'viewer', password: 'Password123!' });

        const lMem = await request(app).post('/auth/login').send({ email: emails.member, password: 'Password123!' });
        tokens.member = lMem.body.token;
        const lVie = await request(app).post('/auth/login').send({ email: emails.viewer, password: 'Password123!' });
        tokens.viewer = lVie.body.token;

        // 3. Setup Outsider (Different Household)
        await request(app).post('/auth/register').send({
            householdName: 'Other House', email: emails.outsider, password: 'Password123!', firstName: 'Outsider'
        });
        const lOut = await request(app).post('/auth/login').send({ email: emails.outsider, password: 'Password123!' });
        tokens.outsider = lOut.body.token;
        otherHouseholdId = lOut.body.household.id;
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${tokens.admin}`);
        if (otherHouseholdId) await request(app).delete(`/households/${otherHouseholdId}`).set('Authorization', `Bearer ${tokens.outsider}`);
        
        await new Promise(resolve => {
            globalDb.serialize(() => {
                globalDb.run("DELETE FROM users WHERE email LIKE 'comp_%@test.com'");
                globalDb.run("DELETE FROM user_households WHERE household_id NOT IN (SELECT id FROM households)", () => resolve());
            });
        });
        if (server && server.close) server.close();
    });

    const CRUD_SUITE = [
        // Core Entities
        { name: 'Members', path: 'members', payload: { name: 'Test Member', type: 'adult' }, update: { name: 'Updated Member' } },
        { name: 'Assets', path: 'assets', payload: { name: 'Test Asset', category: 'Tech' }, update: { name: 'Updated Asset' } },
        { name: 'Vehicles', path: 'vehicles', payload: { make: 'Tesla', model: '3' }, update: { model: 'S' } },
        { name: 'Energy', path: 'energy', payload: { provider: 'Octopus', type: 'Dual' }, update: { provider: 'Ovo' } },
        { name: 'Costs', path: 'costs', payload: { name: 'Spotify', amount: 15, parent_type: 'general' }, update: { amount: 20 } },
        { name: 'Meals', path: 'meals', payload: { name: 'Tacos', emoji: '🌮' }, update: { name: 'Super Tacos' } },
        { name: 'Waste', path: 'waste', payload: { bin_type: 'Recycling', frequency: 'Fortnightly' }, update: { day_of_week: 'Friday' } },
        
        // Finance Entities
        { name: 'Finance Income', path: 'finance/income', payload: { employer: 'Corp', amount: 5000, frequency: 'monthly' }, update: { amount: 5500 }, status: 201 },
        { name: 'Finance Savings', path: 'finance/savings', payload: { institution: 'Natwest', account_name: 'Main', current_balance: 1000 }, update: { current_balance: 1100 }, status: 201 },
        { name: 'Finance Current Accounts', path: 'finance/current-accounts', payload: { bank_name: 'HSBC', account_name: 'Daily', current_balance: 500 }, update: { current_balance: 400 }, status: 201 },
        { name: 'Finance Credit Cards', path: 'finance/credit-cards', payload: { provider: 'Amex', card_name: 'Gold', current_balance: 0 }, update: { current_balance: 100 }, status: 201 },
        { name: 'Finance Loans', path: 'finance/loans', payload: { lender: 'Bank', total_amount: 5000 }, update: { total_amount: 4500 }, status: 201 },
        { name: 'Finance Mortgages', path: 'finance/mortgages', payload: { lender: 'Halifax', total_amount: 250000 }, update: { total_amount: 240000 }, status: 201 },
        { name: 'Finance Investments', path: 'finance/investments', payload: { name: 'Index Fund', platform: 'Vanguard', current_value: 1000 }, update: { current_value: 1050 }, status: 201 },
        { name: 'Finance Pensions', path: 'finance/pensions', payload: { provider: 'Aviva', plan_name: 'Work', current_value: 50000 }, update: { current_value: 51000 }, status: 201 }
    ];

    describe('🔑 Role-Based Access Control (RBAC) Integrity', () => {
        CRUD_SUITE.forEach(entity => {
            describe(`Entity: ${entity.name}`, () => {
                let itemId;
                const successStatus = entity.status || 200;

                test(`[MEMBER] should perform CREATE and UPDATE on ${entity.name}`, async () => {
                    const create = await request(app).post(`/households/${householdId}/${entity.path}`).set('Authorization', `Bearer ${tokens.member}`).send(entity.payload);
                    expect(create.status).toBe(successStatus);
                    itemId = create.body.id;

                    const update = await request(app).put(`/households/${householdId}/${entity.path}/${itemId}`).set('Authorization', `Bearer ${tokens.member}`).send(entity.update);
                    expect(update.status).toBe(200);
                });

                test(`[VIEWER] should be BLOCKED from CREATE on ${entity.name}`, async () => {
                    const res = await request(app).post(`/households/${householdId}/${entity.path}`).set('Authorization', `Bearer ${tokens.viewer}`).send(entity.payload);
                    expect(res.status).toBe(403);
                });

                test(`[OUTSIDER] should be BLOCKED from READ on ${entity.name}`, async () => {
                    const res = await request(app).get(`/households/${householdId}/${entity.path}`).set('Authorization', `Bearer ${tokens.outsider}`);
                    expect(res.status).toBe(403);
                });

                test(`[OUTSIDER] should be BLOCKED from UPDATE on ${entity.name}`, async () => {
                    const res = await request(app).put(`/households/${householdId}/${entity.path}/${itemId}`).set('Authorization', `Bearer ${tokens.outsider}`).send(entity.update);
                    expect(res.status).toBe(403);
                });

                test(`[ADMIN] should perform DELETE on ${entity.name}`, async () => {
                    const res = await request(app).delete(`/households/${householdId}/${entity.path}/${itemId}`).set('Authorization', `Bearer ${tokens.admin}`);
                    expect(res.status).toBe(200);
                });
            });
        });
    });

    describe('🏠 Household Management Restrictions', () => {
        test('[MEMBER] should be BLOCKED from deleting household', async () => {
            const res = await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${tokens.member}`);
            expect(res.status).toBe(403);
        });

        test('[ADMIN] should update household details', async () => {
            const res = await request(app).put(`/households/${householdId}`).set('Authorization', `Bearer ${tokens.admin}`).send({ name: 'New Name' });
            expect(res.status).toBe(200);
        });
    });

    describe('📅 Calendar & Meal Plans', () => {
        test('[MEMBER] should manage meal plans', async () => {
            const meal = await request(app).post(`/households/${householdId}/meals`).set('Authorization', `Bearer ${tokens.member}`).send({ name: 'Plan Meal' });
            const res = await request(app).post(`/households/${householdId}/meal-plans`).set('Authorization', `Bearer ${tokens.member}`).send({
                date: '2026-01-15', meal_id: meal.body.id, member_id: 1
            });
            expect(res.status).toBe(200);
        });

        test('[VIEWER] should read calendar', async () => {
            const res = await request(app).get(`/households/${householdId}/dates`).set('Authorization', `Bearer ${tokens.viewer}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});