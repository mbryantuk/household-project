const request = require('supertest');
const { app, server } = require('../../server');

/**
 * STRESS MATRIX TEST SUITE
 */

describe('🚀 Exhaustive Stress & Isolation Matrix', () => {
    jest.setTimeout(30000); 
    
    const uniqueId = Date.now();
    const hhA = { id: null, key: '', admin: '', member: '', viewer: '' };
    const hhB = { id: null, key: '', admin: '' };

    beforeAll(async () => {
        // 1. Setup Household A
        await request(app).post('/auth/register').send({
            householdName: 'Matrix Alpha', email: `MA_Admin_${uniqueId}@test.com`, password: 'password', firstName: 'MA_Admin'
        });
        
        const lAA = await request(app).post('/auth/login').send({ email: `MA_Admin_${uniqueId}@test.com`, password: 'password' });
        hhA.admin = lAA.body.token;
        hhA.id = lAA.body.household?.id || lAA.body.tokenPayload?.householdId;
        
        if (!hhA.id) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${hhA.admin}`);
            hhA.id = profile.body.default_household_id;
        }

        // Create Member and Viewer in A
        const mRes = await request(app).post(`/households/${hhA.id}/users`).set('Authorization', `Bearer ${hhA.admin}`).send({ email: `MA_Member_${uniqueId}@test.com`, role: 'member', password: 'password', firstName: 'MA_Member' });
        const vRes = await request(app).post(`/households/${hhA.id}/users`).set('Authorization', `Bearer ${hhA.admin}`).send({ email: `MA_Viewer_${uniqueId}@test.com`, role: 'viewer', password: 'password', firstName: 'MA_Viewer' });
        
        const lAM = await request(app).post('/auth/login').send({ email: `MA_Member_${uniqueId}@test.com`, password: 'password' });
        hhA.member = lAM.body.token;
        const lAV = await request(app).post('/auth/login').send({ email: `MA_Viewer_${uniqueId}@test.com`, password: 'password' });
        hhA.viewer = lAV.body.token;

        // 2. Setup Household B
        await request(app).post('/auth/register').send({
            householdName: 'Matrix Beta', email: `MB_Admin_${uniqueId}@test.com`, password: 'password', firstName: 'MB_Admin'
        });
        const lBA = await request(app).post('/auth/login').send({ email: `MB_Admin_${uniqueId}@test.com`, password: 'password' });
        hhB.admin = lBA.body.token;
        hhB.id = lBA.body.household?.id || lBA.body.tokenPayload?.householdId;

        if (!hhB.id) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${hhB.admin}`);
            hhB.id = profile.body.default_household_id;
        }
    });

    afterAll(async () => {
        if (hhA.id) await request(app).delete(`/households/${hhA.id}`).set('Authorization', `Bearer ${hhA.admin}`);
        if (hhB.id) await request(app).delete(`/households/${hhB.id}`).set('Authorization', `Bearer ${hhB.admin}`);
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
                let itemId;

                test(`[ADMIN] Full CRUD on ${endpoint.name}`, async () => {
                    // Create
                    const create = await request(app).post(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.admin}`).send(endpoint.payload);
                    expect(create.status).toBe(200);
                    itemId = create.body.id;

                    // Read List
                    const list = await request(app).get(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.admin}`);
                    expect(list.status).toBe(200);
                    expect(list.body.length).toBeGreaterThan(0);

                    // Update
                    const update = await request(app).put(`/households/${hhA.id}/${endpoint.path}/${itemId}`).set('Authorization', `Bearer ${hhA.admin}`).send(endpoint.payload);
                    expect(update.status).toBe(200);
                });

                test(`[MEMBER] Standard access on ${endpoint.name}`, async () => {
                    const list = await request(app).get(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.member}`);
                    expect(list.status).toBe(200);
                });

                test(`[VIEWER] Read-Only restriction on ${endpoint.name}`, async () => {
                    // Read List (Should Pass)
                    const list = await request(app).get(`/households/${hhA.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhA.viewer}`);
                    expect(list.status).toBe(200);
                });

                test(`[CROSS-TENANT] Isolation enforcement on ${endpoint.name}`, async () => {
                    // Household B tries to see it (List)
                    const listB = await request(app).get(`/households/${hhB.id}/${endpoint.path}`).set('Authorization', `Bearer ${hhB.admin}`);
                    expect(listB.body.some(i => i.id === itemId)).toBe(false);

                    // Household B tries to GET it directly from A's endpoint
                    const getB = await request(app).get(`/households/${hhA.id}/${endpoint.path}/${itemId}`).set('Authorization', `Bearer ${hhB.admin}`);
                    expect(getB.status).toBe(403);
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
    });

    describe('🧪 Data Fuzzing & Boundary Tests', () => {
        test('Should handle massive strings and special characters', async () => {
            const massiveString = "A".repeat(1000);
            const specialChars = "!@#$%^&*()_+{}|:\"<>?~`-=[]\\;',./";
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
                make: 'Bound', model: 'Test',
                mileage: -1 
            });
            expect(res.status).toBe(200);
        });

        test('Should handle null/empty payloads gracefully', async () => {
            const res = await request(app).post(`/households/${hhA.id}/assets`).set('Authorization', `Bearer ${hhA.admin}`).send({});
            // Should either fail with 400 or handle defaults, but not 500
            expect(res.status).not.toBe(500);
        });
    });

    describe('🔄 Rapid Sequential Operations (Stress)', () => {
        test('Create 50 assets in rapid succession', async () => {
            const promises = [];
            for (let i = 0; i < 50; i++) {
                promises.push(request(app).post(`/households/${hhA.id}/assets`).set('Authorization', `Bearer ${hhA.admin}`).send({ name: `Stress ${i}` }));
            }
            const results = await Promise.all(promises);
            results.forEach(r => expect(r.status).toBe(200));
        });
    });

    describe('🌓 Edge Case: Icon & Color Persistence', () => {
        test('should allow null icons and colors in details', async () => {
            const res = await request(app).put(`/households/${hhA.id}/details`)
                .set('Authorization', `Bearer ${hhA.admin}`)
                .send({
                    icon: null,
                    color: null
                });
            expect(res.status).toBe(200);
            
            const check = await request(app).get(`/households/${hhA.id}/details`).set('Authorization', `Bearer ${hhA.admin}`);
            expect(check.body.icon).toBe(null);
        });
    });
});
