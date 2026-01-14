const request = require('supertest');
const { app } = require('../../server');

describe('Household Selector API', () => {
    let token = '';
    const uniqueId = Date.now();
    const email = `selector_${uniqueId}@test.com`;
    const password = 'password123';

    beforeAll(async () => {
        // Register a user first
        await request(app).post('/auth/register').send({
            householdName: 'Selector Test House',
            email,
            password,
            firstName: 'Selector'
        });

        const login = await request(app).post('/auth/login').send({ email, password });
        token = login.body.token;
    });

    it('should return a list of households for the current user', async () => {
        const res = await request(app).get('/auth/my-households').set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });
});