const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Financial Management', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let householdId = null;

    beforeAll(async () => {
        const reg = await request(app).post('/auth/register').send({
            householdName: `FinanceTest_${uniqueId}`,
            email: `finance_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'MoneyAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `finance_${uniqueId}@test.com`, password: 'password' });
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

    // --- RECURRING COSTS ---
    describe('Recurring Costs', () => {
        let costId;
        it('should create a recurring cost', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/costs`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Netflix', amount: 15.99, parent_type: 'general' });
            expect(res.statusCode).toBe(200);
            costId = res.body.id;
        });

        it('should update the cost', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/costs/${costId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 17.99 });
            expect(res.statusCode).toBe(200);
        });
        
        it('should delete the cost', async () => {
            await request(app).delete(`/households/${householdId}/costs/${costId}`).set('Authorization', `Bearer ${token}`);
        });
    });

    // --- UTILITIES (Singleton) ---
    describe('Utilities (Water/Council/Energy)', () => {
        it('should create and check Water info', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/water`)
                .set('Authorization', `Bearer ${token}`)
                .send({ provider: 'Thames Water', monthly_amount: 30 });
            expect(res.statusCode).toBe(200);
            
            const check = await request(app).get(`/households/${householdId}/water`).set('Authorization', `Bearer ${token}`);
            expect(Array.isArray(check.body)).toBe(true);
            expect(check.body[0].provider).toBe('Thames Water');
        });

        it('should create and check Council Tax info', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/council`)
                .set('Authorization', `Bearer ${token}`)
                .send({ authority_name: 'Local Council', band: 'D' });
            expect(res.statusCode).toBe(200);

            const check = await request(app).get(`/households/${householdId}/council`).set('Authorization', `Bearer ${token}`);
            expect(Array.isArray(check.body)).toBe(true);
            expect(check.body[0].authority_name).toBe('Local Council');
        });

        it('should CRUD Energy accounts', async () => {
            const create = await request(app)
                .post(`/households/${householdId}/energy`)
                .set('Authorization', `Bearer ${token}`)
                .send({ provider: 'Octopus', type: 'Electric' });
            expect(create.statusCode).toBe(200);
            const id = create.body.id;

            const update = await request(app)
                .put(`/households/${householdId}/energy/${id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ provider: 'Bulb' });
            expect(update.statusCode).toBe(200);

            await request(app).delete(`/households/${householdId}/energy/${id}`).set('Authorization', `Bearer ${token}`);
        });
    });
});
