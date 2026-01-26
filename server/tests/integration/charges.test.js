const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Recurring Charges', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let householdId = null;
    let monthlyId, weeklyId, yearlyId;

    beforeAll(async () => {
        const reg = await request(app).post('/auth/register').send({
            householdName: `ChargesTest_${uniqueId}`,
            email: `charges_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'MoneyAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `charges_${uniqueId}@test.com`, password: 'password' });
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

    it('should create a monthly charge', async () => {
        const res = await request(app)
            .post(`/households/${householdId}/finance/charges`)
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                name: 'Netflix', 
                amount: 15.99, 
                segment: 'subscription',
                frequency: 'monthly',
                day_of_month: 15,
                adjust_for_working_day: 1
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Netflix');
        monthlyId = res.body.id;
    });

    it('should create a weekly charge', async () => {
        const res = await request(app)
            .post(`/households/${householdId}/finance/charges`)
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                name: 'Cleaner', 
                amount: 40.00, 
                segment: 'household_bill',
                frequency: 'weekly',
                day_of_week: 5, // Friday
                adjust_for_working_day: 0
            });
        expect(res.statusCode).toBe(201);
        weeklyId = res.body.id;
    });

    it('should create a yearly charge', async () => {
        const res = await request(app)
            .post(`/households/${householdId}/finance/charges`)
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                name: 'Car Tax', 
                amount: 165.00, 
                segment: 'vehicle_tax',
                frequency: 'yearly',
                month_of_year: 4, // April
                day_of_month: 1,
                adjust_for_working_day: 1
            });
        expect(res.statusCode).toBe(201);
        yearlyId = res.body.id;
    });

    it('should list all charges', async () => {
        const res = await request(app)
            .get(`/households/${householdId}/finance/charges`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(3);
        const netflix = res.body.find(c => c.id === monthlyId);
        expect(netflix.frequency).toBe('monthly');
        expect(netflix.day_of_month).toBe(15);
    });

    it('should update a charge', async () => {
        const res = await request(app)
            .put(`/households/${householdId}/finance/charges/${monthlyId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                name: 'Netflix Premium',
                amount: 19.99,
                segment: 'subscription',
                frequency: 'monthly',
                day_of_month: 15
            });
        expect(res.statusCode).toBe(200);
        
        const check = await request(app)
            .get(`/households/${householdId}/finance/charges`)
            .set('Authorization', `Bearer ${token}`);
        const updated = check.body.find(c => c.id === monthlyId);
        expect(updated.name).toBe('Netflix Premium');
        expect(updated.amount).toBe(19.99);
    });

    it('should delete (archive) a charge', async () => {
        const res = await request(app)
            .delete(`/households/${householdId}/finance/charges/${weeklyId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);

        const check = await request(app)
            .get(`/households/${householdId}/finance/charges`)
            .set('Authorization', `Bearer ${token}`);
        const archived = check.body.find(c => c.id === weeklyId);
        expect(archived).toBeDefined();
        expect(archived.is_active).toBe(0);
    });
});
