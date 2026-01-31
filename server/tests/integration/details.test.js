const request = require('supertest');
const { app } = require('../../server');
const pkg = require('../../../package.json');

describe('Property Details API', () => {
    let token = '';
    const uniqueId = Date.now();
    let householdId = null;

    beforeAll(async () => {
        // Setup
        await request(app).post('/auth/register').send({
            householdName: `Details Test (v${pkg.version})`,
            email: `details_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'DetailsAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `details_${uniqueId}@test.com`, password: 'password' });
        token = login.body.token;
        householdId = login.body.household?.id || login.body.tokenPayload?.householdId;
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
    });

    describe('House Details', () => {
        it('should update house details', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/details`)
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    property_type: 'Detached', 
                    bedrooms: 4,
                    purchase_price: 350000,
                    current_valuation: 420000
                });
            expect(res.statusCode).toBe(200);
        });

        it('should get house details', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/details`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.property_type).toBe('Detached');
            expect(res.body.purchase_price).toBe(350000);
            expect(res.body.current_valuation).toBe(420000);
        });
    });

    describe('Water Info', () => {
        let waterId;
        it('should create water info', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/water`)
                .set('Authorization', `Bearer ${token}`)
                .send({ provider: 'Thames Water', meter_serial: '12345' });
            expect(res.statusCode).toBe(200);
            waterId = res.body.id;
        });

        it('should get water info list', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/water`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const item = res.body.find(i => i.id === waterId);
            expect(item).toBeDefined();
            expect(item.provider).toBe('Thames Water');
        });
    });

    describe('Waste Collections', () => {
        let wasteId;

        it('should create waste collection', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/waste`)
                .set('Authorization', `Bearer ${token}`)
                .send({ day_of_week: 'Monday', waste_type: 'General', frequency: 'Weekly' });
            expect(res.statusCode).toBe(200); // 201 or 200 depending on implementation
            wasteId = res.body.id;
        });

        it('should list waste collections', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/waste`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('should delete waste collection', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}/waste/${wasteId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });
});
