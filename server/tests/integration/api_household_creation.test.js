const request = require('supertest');
const { app } = require('../../server');
const pkg = require('../../../package.json');

describe('Household Creation (API)', () => {
    const uniqueId = Date.now();
    const apiHouseholdName = `Brady Family (API) (v${pkg.version})`;
    const adminEmail = `api_brady_${uniqueId}@test.com`;
    const password = 'Password123!';
    let token = '';
    let householdId = null;

    it('should create "Brady Family (API)" via Registration', async () => {
        const res = await request(app).post('/auth/register').send({
            householdName: apiHouseholdName,
            email: adminEmail,
            password: password,
            firstName: 'Mike',
            lastName: 'Brady'
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toMatch(/successful/i);
    });

    it('should login as the new API admin', async () => {
        const res = await request(app).post('/auth/login').send({
            email: adminEmail,
            password: password
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        
        // Login returns the household object if user has a default
        expect(res.body.household).toBeDefined();
        expect(res.body.household.name).toBe(apiHouseholdName);
        
        token = res.body.token;
        householdId = res.body.household.id;
    });

    it('should retrieve the household details', async () => {
        const res = await request(app)
            .get(`/households/${householdId}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe(apiHouseholdName);
    });

    it('should invite "mbryantuk@gmail.com" to the API household', async () => {
        const res = await request(app)
            .post(`/households/${householdId}/users`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                email: 'mbryantuk@gmail.com',
                first_name: 'Matt',
                role: 'admin'
            });
            
        // 200 (Linked) or 201 (Created)
        // If mbryantuk already exists, it might link.
        expect([200, 201]).toContain(res.statusCode);
    });

    afterAll(async () => {
        if (householdId && token) {
            // Note: In real scenarios, we might not want to delete it if we want to debug, 
            // but the nightly suite cleans up anyway.
            // Keeping it alive allows the check script to verify existence.
            // await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
        }
    });
});