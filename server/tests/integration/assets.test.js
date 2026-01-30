const request = require('supertest');
const { app } = require('../../server');
const pkg = require('../../../package.json');

describe('Assets API', () => {
    let token = '';
    const uniqueId = Date.now();
    let householdId = null;

    beforeAll(async () => {
        // Setup
        await request(app).post('/auth/register').send({
            householdName: `Assets Test (v${pkg.version})`,
            email: `assets_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'AssetAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `assets_${uniqueId}@test.com`, password: 'password' });
        token = login.body.token;
        householdId = login.body.household?.id || login.body.tokenPayload?.householdId;
        
        if (!householdId) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${token}`);
            householdId = profile.body.default_household_id;
        }
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
    });

    // --- ASSETS ---
    describe('General Assets', () => {
        let assetId;

        it('should create an asset', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/assets`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Gaming PC', category: 'Electronics', purchase_value: 1500 });
            expect(res.statusCode).toBe(200);
            assetId = res.body.id;
        });

        it('should update the asset', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/assets/${assetId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ purchase_value: 1400 });
            expect(res.statusCode).toBe(200);
        });

        it('should delete the asset', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}/assets/${assetId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });

    // --- VEHICLES ---
    describe('Vehicles', () => {
        let vehicleId;

        it('should create a vehicle', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/vehicles`)
                .set('Authorization', `Bearer ${token}`)
                .send({ make: 'Ford', model: 'Focus', mot_due: '2026-01-01' });
            expect(res.statusCode).toBe(200);
            vehicleId = res.body.id;
        });

        // Sub-modules
        it('should add a service record', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/vehicles/${vehicleId}/services`)
                .set('Authorization', `Bearer ${token}`)
                .send({ date: '2025-02-01', description: 'Tires', cost: 200 });
            expect(res.statusCode).toBe(200);
        });

        it('should add finance info', async () => {
             const res = await request(app)
                .post(`/households/${householdId}/vehicles/${vehicleId}/finance`)
                .set('Authorization', `Bearer ${token}`)
                .send({ provider: 'Bank', monthly_payment: 250 });
            expect(res.statusCode).toBe(200);
        });

        it('should delete the vehicle', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}/vehicles/${vehicleId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });
});
