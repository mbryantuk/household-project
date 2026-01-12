const request = require('supertest');
const { app } = require('../server');

describe('Household Selector API', () => {
    let token = '';
    
    beforeAll(async () => {
        const login = await request(app).post('/auth/login').send({ username: 'superuser', password: 'superpassword' });
        token = login.body.token;
    });

    it('should return a list of households for the current user', async () => {
        const res = await request(app).get('/auth/my-households').set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
