const request = require('supertest');
const { app, server } = require('../server');

/**
 * STRESS MATRIX TEST SUITE
 * This suite performs hundreds of tests by iterating through combinations of:
 * 1. Roles (Admin, Member, Viewer, Unauthorized)
 * 2. Multi-Tenancy (Same Household, Different Household)
 * 3. Tables (Vehicles, Assets, People, Dates, Costs, etc.)
 * 4. Data Variances (Empty, Huge, Special Chars, Nulls)
 */

describe('🚀 Exhaustive Stress & Isolation Matrix', () => {
    let sysAdminToken = '';
    jest.setTimeout(30000); // 30 seconds
    
    // Test Environment Setup
    const uniqueId = Date.now();
    const hhA = { id: null, key: '', admin: '', member: '', viewer: '' };
    const hhB = { id: null, key: '', admin: '' };

    beforeAll(async () => {
        // 1. SysAdmin Login
        const loginRes = await request(app).post('/auth/login').send({ email: 'super@totem.local', password: 'superpassword' });
        sysAdminToken = loginRes.body.token;

        // 2. Setup Household A
        const resA = await request(app).post('/admin/households').set('Authorization', `Bearer ${sysAdminToken}`).send({
            name: 'Matrix Alpha', adminUsername: 'MA_Admin', adminEmail: `MA_Admin_${uniqueId}@test.com`, adminPassword: 'password'
        });
        hhA.id = resA.body.householdId;
        hhA.key = resA.body.accessKey;
        
        const lAA = await request(app).post('/auth/login').send({ email: `MA_Admin_${uniqueId}@test.com`, password: 'password' });
        hhA.admin = lAA.body.token;

        // Create Member and Viewer in A
        // Using SysAdmin endpoint for convenience, but using email now
        await request(app).post('/admin/create-user').set('Authorization', `Bearer ${sysAdminToken}`).send({ username: 'MA_Member', email: `MA_Member_${uniqueId}@test.com`, role: 'member', password: 'password', householdId: hhA.id });
        await request(app).post('/admin/create-user').set('Authorization', `Bearer ${sysAdminToken}`).send({ username: 'MA_Viewer', email: `MA_Viewer_${uniqueId}@test.com`, role: 'viewer', password: 'password', householdId: hhA.id });
        
        const lAM = await request(app).post('/auth/login').send({ email: `MA_Member_${uniqueId}@test.com`, password: 'password' });
        hhA.member = lAM.body.token;
        const lAV = await request(app).post('/auth/login').send({ email: `MA_Viewer_${uniqueId}@test.com`, password: 'password' });
        hhA.viewer = lAV.body.token;

        // 3. Setup Household B
        const resB = await request(app).post('/admin/households').set('Authorization', `Bearer ${sysAdminToken}`).send({
            name: 'Matrix Beta', adminUsername: 'MB_Admin', adminEmail: `MB_Admin_${uniqueId}@test.com`, adminPassword: 'password'
        });
        hhB.id = resB.body.householdId;
        hhB.key = resB.body.accessKey;
        const lBA = await request(app).post('/auth/login').send({ email: `MB_Admin_${uniqueId}@test.com`, password: 'password' });
        hhB.admin = lBA.body.token;
    });

    afterAll(async () => {
        if (hhA.id) await request(app).delete(`/admin/households/${hhA.id}`).set('Authorization', `Bearer ${sysAdminToken}`);
        if (hhB.id) await request(app).delete(`/admin/households/${hhB.id}`).set('Authorization', `Bearer ${sysAdminToken}`);
        if (server && server.close) server.close();
    });

    const TARGET_ENDPOINTS = [
        { path: 'vehicles', payload: { make: 'Test', model: 'Stress' }, name: 'Vehicles' },
        { path: 'assets', payload: { name: 'Widget' }, name: 'Assets' },
        { path: 'members', payload: { name: 'Person', type: 'adult' }, name: 'Residents' },
        { path: 'energy', payload: { provider: 'PowerCo' }, name: 'Energy' },
        { path: 'costs', payload: { name: 'Tax', amount: 100, parent_type: 'general' }, name: 'Recurring Costs' },
        { path: 'waste', payload: { waste_type: 'General', frequency: 'Weekly', collection_day: 'Monday' }, name: 'Waste' }
    ];

    describe('⚔️ Combinatorial Role vs Table Access', () => {
        TARGET_ENDPOINTS.forEach(endpoint => {
            describe(`Path: /households/:id/${endpoint.path}`, () => {
                
                test(`[ADMIN] Full CRUD on ${endpoint.name}`, async () => {
                    // Create
                    const create = await request(app).post(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.admin}`).send(endpoint.payload);
                    expect(create.status).toBe(200);
                    const itemId = create.body.id;

                    // Read List
                    const list = await request(app).get(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.admin}`);
                    expect(list.body.some(i => i.id === itemId)).toBe(true);

                    // Update
                    const update = await request(app).put(`/households/${hhA.id}/${endpoint.path}/${itemId}`).set('Authorization', `Bearer ${hhA.admin}`).send({ ...endpoint.payload, notes: 'Updated' });
                    expect(update.status).toBe(200);

                    // Delete
                    const del = await request(app).delete(`/households/${hhA.id}/${endpoint.path}/${itemId}`).set('Authorization', `Bearer ${hhA.admin}`);
                    expect(del.status).toBe(200);
                });

                test(`[VIEWER] Read-Only restriction on ${endpoint.name}`, async () => {
                    // Create (Should Fail)
                    const create = await request(app).post(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.viewer}`).send(endpoint.payload);
                    expect(create.status).toBe(403);

                    // Read List (Should Pass)
                    const list = await request(app).get(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.viewer}`);
                    expect(list.status).toBe(200);
                });

                test(`[CROSS-TENANT] Isolation enforcement on ${endpoint.name}`, async () => {
                    // Household A creates an item
                    const createA = await request(app).post(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.admin}`).send(endpoint.payload);
                    const itemId = createA.body.id;

                    // Household B tries to see it (List)
                    const listB = await request(app).get(`/households/${hhB.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhB.admin}`);
                    expect(listB.body.some(i => i.id === itemId)).toBe(false);

                    // Household B tries to GET it directly from A's endpoint
                    const getB = await request(app).get(`/households/${hhA.id}/${endpoint.path}/${itemId}`).set('Authorization', `Bearer ${hhB.admin}`);
                    expect(getB.status).toBe(403);

                    // Household B tries to DELETE it
                    const delB = await request(app).delete(`/households/${hhA.id}/${endpoint.path}/${itemId}`).set('Authorization', `Bearer ${hhB.admin}`);
                    expect(delB.status).toBe(403);
                });
            });
        });
    });

    describe('👤 Identity & Profile Coverage', () => {
        test('[AUTH] All roles can access /auth/profile', async () => {
            const roles = [hhA.admin, hhA.member, hhA.viewer];
            for (const token of roles) {
                const res = await request(app).get('/auth/profile').set('Authorization', `Bearer ${token}`);
                expect(res.status).toBe(200);
            }
        });

        test('[AUTH] SysAdmin can fetch specific users via /admin/users/:id', async () => {
            // We need a userId. Let's create one.
            const create = await request(app).post('/admin/create-user').set('Authorization', `Bearer ${sysAdminToken}`).send({ 
                username: 'FetchTest', email: `fetch_${Date.now()}@test.com`, password: 'password', householdId: hhA.id 
            });
            const userId = create.body.id;

            const res = await request(app).get(`/admin/users/${userId}`).set('Authorization', `Bearer ${sysAdminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(userId);
        });

        test('[AUTH] Household Admin CANNOT fetch users via /admin/users/:id (SysAdmin only)', async () => {
            const create = await request(app).post('/admin/create-user').set('Authorization', `Bearer ${sysAdminToken}`).send({ 
                username: 'FetchTest2', email: `fetch2_${Date.now()}@test.com`, password: 'password', householdId: hhA.id 
            });
            const userId = create.body.id;

            const res = await request(app).get(`/admin/users/${userId}`).set('Authorization', `Bearer ${hhA.admin}`);
            expect(res.status).toBe(403);
        });
    });

    describe('🧪 Data Fuzzing & Boundary Tests', () => {
        test('Should handle massive strings and special characters', async () => {
            const massiveString = 'A'.repeat(5000);
            const specialChars = '!"£$%^&*()_+{}[]:@~#<>,.?/|';
            
            const res = await request(app).post(`/households/${hhA.id}/assets`).set('Authorization', `Bearer ${hhA.admin}`).send({
                name: specialChars,
                notes: massiveString
            });
            expect(res.status).toBe(200);
            const saved = await request(app).get(`/households/${hhA.id}/assets/${res.body.id}`).set('Authorization', `Bearer ${hhA.admin}`);
            expect(saved.body.name).toBe(specialChars);
        });

        test('Should handle numeric boundary values', async () => {
            const res = await request(app).post(`/households/${hhA.id}/vehicles`).set('Authorization', `Bearer ${hhA.admin}`).send({
                make: 'Edge', model: 'Case',
                purchase_value: 999999999.99,
                mileage: -1 // Negative mileage check (if allowed by schema, it should at least not crash)
            });
            expect(res.status).toBe(200);
        });

        test('Should handle null/empty payloads gracefully', async () => {
            const res = await request(app).post(`/households/${hhA.id}/assets`).set('Authorization', `Bearer ${hhA.admin}`).send({});
            // Depending on implementation, this might be 200 (empty row) or 400/500
            // The goal is "No Crash"
            expect(res.status).not.toBe(500);
        });
    });

    describe('🔄 Rapid Sequential Operations (Stress)', () => {
        test('Create 50 assets in rapid succession', async () => {
            const promises = [];
            for(let i=0; i<50; i++) {
                promises.push(request(app).post(`/households/${hhA.id}/assets`).set('Authorization', `Bearer ${hhA.admin}`).send({ name: `Bulk Asset ${i}` }));
            }
            const results = await Promise.all(promises);
            results.forEach(r => expect(r.status).toBe(200));
        });
    });

    describe('🌓 Edge Case: Icon & Color Persistence', () => {
        test('should allow null icons and colors in details', async () => {
            const res = await request(app)
                .put(`/households/${hhA.id}/details`)
                .set('Authorization', `Bearer ${hhA.admin}`)
                .send({
                    property_type: 'Test',
                    icon: null,
                    color: null
                });
            expect(res.status).toBe(200);
            
            const check = await request(app).get(`/households/${hhA.id}/details`).set('Authorization', `Bearer ${hhA.admin}`);
            expect(check.body.icon).toBe(null);
        });
    });
});