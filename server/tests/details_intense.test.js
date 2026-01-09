const request = require('supertest');
const { app } = require('../server');

describe('Intense Details API Module Tests (Full CRUD + Viewer Restrictions)', () => {
    let sysAdminToken = '';
    let householdId = null;
    let accessKey = '';
    let householdAdminToken = '';
    let householdViewerToken = '';

    const householdName = `Details Test HH ${Date.now()}`;
    const adminCreds = { username: 'AdminOwner', password: 'password123' };
    const viewerCreds = { username: 'ViewerUser', password: 'password123' };

    beforeAll(async () => {
        // 1. SysAdmin Login
        const loginRes = await request(app)
            .post('/auth/login')
            .send({ username: 'superuser', password: 'superpassword' });
        sysAdminToken = loginRes.body.token;

        // 2. Create Household
        const hhRes = await request(app)
            .post('/admin/households')
            .set('Authorization', `Bearer ${sysAdminToken}`)
            .send({
                name: householdName,
                adminUsername: adminCreds.username,
                adminPassword: adminCreds.password
            });
        
        householdId = hhRes.body.householdId;
        accessKey = hhRes.body.accessKey;

        // 3. Admin Login
        const adminLoginRes = await request(app)
            .post('/auth/login')
            .send({ username: adminCreds.username, accessKey: accessKey, password: adminCreds.password });
        householdAdminToken = adminLoginRes.body.token;

        // 4. Create Viewer User
        await request(app)
            .post('/admin/create-user')
            .set('Authorization', `Bearer ${householdAdminToken}`)
            .send({ username: viewerCreds.username, role: 'viewer', password: viewerCreds.password });

        // 5. Viewer Login
        const viewerLoginRes = await request(app)
            .post('/auth/login')
            .send({ username: viewerCreds.username, accessKey: accessKey, password: viewerCreds.password });
        householdViewerToken = viewerLoginRes.body.token;
    });

    afterAll(async () => {
        if (householdId && sysAdminToken) {
            await request(app)
                .delete(`/admin/households/${householdId}`)
                .set('Authorization', `Bearer ${sysAdminToken}`);
        }
    });

    const testCrudModule = (entityName, path, initialData, updateData) => {
        let itemId = null;

        describe(`${entityName} Module`, () => {
            test(`[CREATE] Admin should be able to create ${entityName}`, async () => {
                const res = await request(app)
                    .post(`/households/${householdId}/${path}`)
                    .set('Authorization', `Bearer ${householdAdminToken}`)
                    .send(initialData);
                expect(res.status).toBe(200);
                expect(res.body.id).toBeDefined();
                itemId = res.body.id;
            });

            test(`[READ LIST] Viewer should be able to list ${entityName}`, async () => {
                const res = await request(app)
                    .get(`/households/${householdId}/${path}`)
                    .set('Authorization', `Bearer ${householdViewerToken}`);
                expect(res.status).toBe(200);
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBeGreaterThan(0);
            });

            test(`[READ SINGLE] Viewer should be able to get single ${entityName}`, async () => {
                const res = await request(app)
                    .get(`/households/${householdId}/${path}/${itemId}`)
                    .set('Authorization', `Bearer ${householdViewerToken}`);
                expect(res.status).toBe(200);
                expect(res.body.id).toBe(itemId);
            });

            test(`[UPDATE] Admin should be able to update ${entityName}`, async () => {
                const res = await request(app)
                    .put(`/households/${householdId}/${path}/${itemId}`)
                    .set('Authorization', `Bearer ${householdAdminToken}`)
                    .send(updateData);
                expect(res.status).toBe(200);
            });

            test(`[RESTRICTION] Viewer should NOT be able to update ${entityName}`, async () => {
                const res = await request(app)
                    .put(`/households/${householdId}/${path}/${itemId}`)
                    .set('Authorization', `Bearer ${householdViewerToken}`)
                    .send(updateData);
                expect(res.status).toBe(403);
            });

            test(`[RESTRICTION] Viewer should NOT be able to delete ${entityName}`, async () => {
                const res = await request(app)
                    .delete(`/households/${householdId}/${path}/${itemId}`)
                    .set('Authorization', `Bearer ${householdViewerToken}`);
                expect(res.status).toBe(403);
            });

            test(`[DELETE] Admin should be able to delete ${entityName}`, async () => {
                const res = await request(app)
                    .delete(`/households/${householdId}/${path}/${itemId}`)
                    .set('Authorization', `Bearer ${householdAdminToken}`);
                expect(res.status).toBe(200);
                
                // Verify 404
                const verify = await request(app)
                    .get(`/households/${householdId}/${path}/${itemId}`)
                    .set('Authorization', `Bearer ${householdAdminToken}`);
                expect(verify.status).toBe(404);
            });
        });
    };

    // Test List-based Modules
    testCrudModule('Vehicles', 'vehicles', 
        { make: 'Tesla', model: 'Model 3', registration: 'EL3C TRIC' }, 
        { mileage: 25000 }
    );

    testCrudModule('Assets', 'assets', 
        { name: 'Home Theater', category: 'Electronics' }, 
        { status: 'maintenance' }
    );

    testCrudModule('Energy Accounts', 'energy', 
        { provider: 'Octopus', type: 'Dual Fuel' }, 
        { account_number: 'OCTO-999' }
    );

    // Test Singleton Modules (id=1)
    describe('🏠 Singleton Modules (id=1)', () => {
        const testSingleton = (name, path, data) => {
            test(`[UPDATE] Admin should be able to update ${name}`, async () => {
                const res = await request(app)
                    .put(`/households/${householdId}/${path}`)
                    .set('Authorization', `Bearer ${householdAdminToken}`)
                    .send(data);
                expect(res.status).toBe(200);
            });

            test(`[READ] Viewer should be able to read ${name}`, async () => {
                const res = await request(app)
                    .get(`/households/${householdId}/${path}`)
                    .set('Authorization', `Bearer ${householdViewerToken}`);
                expect(res.status).toBe(200);
                const firstKey = Object.keys(data)[0];
                expect(res.body[firstKey]).toBe(data[firstKey]);
            });

            test(`[RESTRICTION] Viewer should NOT be able to update ${name}`, async () => {
                const res = await request(app)
                    .put(`/households/${householdId}/${path}`)
                    .set('Authorization', `Bearer ${householdViewerToken}`)
                    .send(data);
                expect(res.status).toBe(403);
            });
        };

        testSingleton('House Details', 'details', { property_type: 'Detached' });
        testSingleton('Water Info', 'water', { provider: 'Thames Water' });
        testSingleton('Council Info', 'council', { authority_name: 'Local Council' });
        testSingleton('Waste Info', 'waste', { collection_day: 'Monday' });
    });
});
