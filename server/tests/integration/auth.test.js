const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Authentication & Profile', () => {
    jest.setTimeout(30000);
    
    const uniqueId = Date.now();
    const adminEmail = `auth_admin_${uniqueId}@test.com`;
    const adminPassword = 'password123';
    let token = '';
    let householdId = null;

    it('should register a new household', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({
                householdName: `AuthTest_${uniqueId}`,
                email: adminEmail,
                password: adminPassword,
                firstName: 'Auth',
                lastName: 'Admin'
            });
        expect(res.statusCode).toBe(201);
    });

    it('should login and receive a token', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: adminEmail,
                password: adminPassword 
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        token = res.body.token;
        householdId = res.body.household?.id || res.body.tokenPayload?.householdId;
    });

    it('should retrieve the user profile', async () => {
        const res = await request(app)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.email).toBe(adminEmail);
        
        // Ensure householdId is consistent
        if (!householdId) householdId = res.body.default_household_id;
    });

    afterAll(async () => {
        if (householdId) {
            await request(app).delete(`/households/${householdId}`).set('Authorization', `Bearer ${token}`);
        }
    });
});
