const request = require('supertest');
const { app } = require('../server');

describe('Intense Multi-Tenant & Asset-First API Tests', () => {
    jest.setTimeout(30000);
    
    const uniqueId = Date.now();
    const hhA = { id: null, adminToken: '', viewerToken: '', email: `hhA_${uniqueId}@test.com` };
    const hhB = { id: null, adminToken: '', email: `hhB_${uniqueId}@test.com` };

    beforeAll(async () => {
        // 1. Setup Household A
        await request(app).post('/auth/register').send({ householdName: 'House A', email: hhA.email, password: 'password', firstName: 'AdminA' });
        const loginA = await request(app).post('/auth/login').send({ email: hhA.email, password: 'password' });
        hhA.adminToken = loginA.body.token;
        hhA.id = loginA.body.household?.id || loginA.body.tokenPayload?.householdId;
        
        if (!hhA.id) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${hhA.adminToken}`);
            hhA.id = profile.body.default_household_id;
        }

        // Create Viewer in A
        await request(app).post(`/households/${hhA.id}/users`).set('Authorization', `Bearer ${hhA.adminToken}`).send({ email: `viewerA_${uniqueId}@test.com`, role: 'viewer', password: 'password' });
        const loginV = await request(app).post('/auth/login').send({ email: `viewerA_${uniqueId}@test.com`, password: 'password' });
        hhA.viewerToken = loginV.body.token;

        // 2. Setup Household B
        await request(app).post('/auth/register').send({ householdName: 'House B', email: hhB.email, password: 'password', firstName: 'AdminB' });
        const loginB = await request(app).post('/auth/login').send({ email: hhB.email, password: 'password' });
        hhB.adminToken = loginB.body.token;
        hhB.id = loginB.body.household?.id || loginB.body.tokenPayload?.householdId;

        if (!hhB.id) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${hhB.adminToken}`);
            hhB.id = profile.body.default_household_id;
        }
    });

    afterAll(async () => {
        if (hhA.id) await request(app).delete(`/households/${hhA.id}`).set('Authorization', `Bearer ${hhA.adminToken}`);
        if (hhB.id) await request(app).delete(`/households/${hhB.id}`).set('Authorization', `Bearer ${hhB.adminToken}`);
    });

    describe('🔐 Multi-Tenant Isolation', () => {
        let vehicleAId;

        beforeAll(async () => {
            const res = await request(app).post(`/households/${hhA.id}/vehicles`).set('Authorization', `Bearer ${hhA.adminToken}`).send({ make: 'Tesla', model: 'A' });
            vehicleAId = res.body.id;
        });

        test('Household B should NOT be able to see Household A vehicles', async () => {
            const res = await request(app).get(`/households/${hhB.id}/vehicles`).set('Authorization', `Bearer ${hhB.adminToken}`);
            expect(res.body.some(v => v.id === vehicleAId)).toBe(false);
        });

        test('Household B should NOT be able to access Household A vehicle directly', async () => {
            const res = await request(app).get(`/households/${hhA.id}/vehicles/${vehicleAId}`).set('Authorization', `Bearer ${hhB.adminToken}`);
            expect(res.status).toBe(403);
        });
    });

    describe('💰 Asset-First Financial Modeling', () => {
        test('should create vehicle with financial fields', async () => {
            const res = await request(app).post(`/households/${hhA.id}/vehicles`)
                .set('Authorization', `Bearer ${hhA.adminToken}`)
                .send({
                    make: 'BMW', model: 'M3',
                    purchase_value: 50000,
                    monthly_maintenance_cost: 150
                });
            expect(res.status).toBe(200);
            expect(res.body.purchase_value).toBe(50000);
        });

        test('should create asset with financial fields', async () => {
            const res = await request(app).post(`/households/${hhA.id}/assets`)
                .set('Authorization', `Bearer ${hhA.adminToken}`)
                .send({
                    name: 'Fridge',
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
            const res = await request(app).post(`/households/${hhA.id}/assets`)
                .set('Authorization', `Bearer ${hhA.viewerToken}`)
                .send({ name: 'Hack' });
            expect(res.status).toBe(403);
        });
    });
});
