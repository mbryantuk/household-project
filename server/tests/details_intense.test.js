const request = require('supertest');
const { app, server } = require('../server');

describe('Intense Multi-Tenant & Asset-First API Tests', () => {
    let sysAdminToken = '';
    
    // Household A (Admin + Viewer)
    let hhA = { id: null, key: '', adminToken: '', viewerToken: '' };
    // Household B (Admin) - To verify isolation
    let hhB = { id: null, key: '', adminToken: '' };

    beforeAll(async () => {
        // 1. SysAdmin Login
        const loginRes = await request(app)
            .post('/auth/login')
            .send({ username: 'superuser', password: 'superpassword' });
        sysAdminToken = loginRes.body.token;

        // 2. Setup Household A
        const resA = await request(app).post('/admin/households').set('Authorization', `Bearer ${sysAdminToken}`).send({
            name: 'Household Alpha', adminUsername: 'AdminA', adminPassword: 'password123'
        });
        hhA.id = resA.body.householdId;
        hhA.key = resA.body.accessKey;
        
        const loginA = await request(app).post('/auth/login').send({ username: 'AdminA', accessKey: hhA.key, password: 'password123' });
        hhA.adminToken = loginA.body.token;

        await request(app).post('/admin/create-user').set('Authorization', `Bearer ${hhA.adminToken}`).send({
            username: 'ViewerA', role: 'viewer', password: 'password123'
        });
        const loginViewerA = await request(app).post('/auth/login').send({ username: 'ViewerA', accessKey: hhA.key, password: 'password123' });
        hhA.viewerToken = loginViewerA.body.token;

        // 3. Setup Household B
        const resB = await request(app).post('/admin/households').set('Authorization', `Bearer ${sysAdminToken}`).send({
            name: 'Household Beta', adminUsername: 'AdminB', adminPassword: 'password123'
        });
        hhB.id = resB.body.householdId;
        hhB.key = resB.body.accessKey;
        const loginB = await request(app).post('/auth/login').send({ username: 'AdminB', accessKey: hhB.key, password: 'password123' });
        hhB.adminToken = loginB.body.token;
    });

    afterAll(async () => {
        await request(app).delete(`/admin/households/${hhA.id}`).set('Authorization', `Bearer ${sysAdminToken}`);
        await request(app).delete(`/admin/households/${hhB.id}`).set('Authorization', `Bearer ${sysAdminToken}`);
        if (server && server.close) server.close();
    });

    describe('🔐 Multi-Tenant Isolation', () => {
        test('Household B should NOT be able to see Household A vehicles', async () => {
            // Create vehicle in A
            await request(app).post(`/households/${hhA.id}/vehicles`).set('Authorization', `Bearer ${hhA.adminToken}`).send({ make: 'Tesla', model: 'A' });
            
            // Try to list from B
            const res = await request(app).get(`/households/${hhB.id}/vehicles`).set('Authorization', `Bearer ${hhB.adminToken}`);
            expect(res.body.length).toBe(0);
        });

        test('Household B should NOT be able to access Household A vehicle directly', async () => {
            const createA = await request(app).post(`/households/${hhA.id}/vehicles`).set('Authorization', `Bearer ${hhA.adminToken}`).send({ make: 'Tesla', model: 'A' });
            const vehicleId = createA.body.id;

            // Try to GET A's vehicle using B's token
            const res = await request(app).get(`/households/${hhA.id}/vehicles/${vehicleId}`).set('Authorization', `Bearer ${hhB.adminToken}`);
            expect(res.status).toBe(403); // Middleware should block cross-tenant ID access
        });
    });

    describe('💰 Asset-First Financial Modeling', () => {
        test('should create vehicle with financial fields', async () => {
            const res = await request(app)
                .post(`/households/${hhA.id}/vehicles`)
                .set('Authorization', `Bearer ${hhA.adminToken}`)
                .send({
                    make: 'BMW', model: 'i4', 
                    purchase_value: 50000, 
                    replacement_cost: 55000,
                    monthly_maintenance_cost: 150
                });
            expect(res.status).toBe(200);
            expect(res.body.purchase_value).toBe(50000);
        });

        test('should create asset with financial fields', async () => {
            const res = await request(app)
                .post(`/households/${hhA.id}/assets`)
                .set('Authorization', `Bearer ${hhA.adminToken}`)
                .send({
                    name: 'Fridge Freezer', 
                    purchase_value: 1200, 
                    replacement_cost: 1400,
                    depreciation_rate: 0.1
                });
            expect(res.status).toBe(200);
            expect(res.body.replacement_cost).toBe(1400);
        });
    });

    describe('🛡️ RBAC Enforcement', () => {
        test('Viewer should be able to READ assets', async () => {
            const res = await request(app).get(`/households/${hhA.id}/assets`).set('Authorization', `Bearer ${hhA.viewerToken}`);
            expect(res.status).toBe(200);
        });

        test('Viewer should NOT be able to CREATE assets', async () => {
            const res = await request(app).post(`/households/${hhA.id}/assets`).set('Authorization', `Bearer ${hhA.viewerToken}`).send({ name: 'Illegal' });
            expect(res.status).toBe(403);
        });
    });
});
