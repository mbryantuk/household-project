const request = require('supertest');
const app = require('../App');
const { globalDb, dbRun, dbGet } = require('../db');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

describe('Profile API', () => {
    let token;
    let userId;

    beforeAll(async () => {
        // Create a test user
        const result = await dbRun(globalDb, 
            "INSERT INTO users (email, password_hash, first_name, last_name, system_role) VALUES (?, ?, ?, ?, ?)",
            ['profile_test@example.com', 'hash', 'Profile', 'Test', 'user']
        );
        userId = result.id;
        token = jwt.sign({ id: userId, email: 'profile_test@example.com' }, SECRET_KEY);
    });

    afterAll(async () => {
        await dbRun(globalDb, "DELETE FROM users WHERE id = ?", [userId]);
    });

    it('should retrieve the user profile with custom_theme', async () => {
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', userId);
        expect(res.body).toHaveProperty('theme');
        expect(res.body).toHaveProperty('custom_theme');
    });

    it('should update the user theme', async () => {
        const res = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ theme: 'midnight' });

        expect(res.status).toBe(200);
        
        const user = await dbGet(globalDb, "SELECT theme FROM users WHERE id = ?", [userId]);
        expect(user.theme).toBe('midnight');
    });

    it('should update the custom_theme', async () => {
        const customTheme = JSON.stringify({ primary: '#ff0000', mode: 'dark' });
        const res = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ custom_theme: customTheme });

        expect(res.status).toBe(200);
        
        const user = await dbGet(globalDb, "SELECT custom_theme FROM users WHERE id = ?", [userId]);
        expect(user.custom_theme).toBe(customTheme);
    });
});
