const request = require('supertest');
const { app } = require('../server'); // Import app directly, server might not be exported or needed if using supertest with app

describe('🛒 Shopping List API Verification', () => {
    let householdId;
    let token;
    let adminEmail = `admin_shopping_${Date.now()}@test.com`;
    let itemId;

    beforeAll(async () => {
        // Register and login to get a token and household ID
        await request(app).post('/api/auth/register').send({
            householdName: 'Shopping House',
            email: adminEmail,
            password: 'Password123!'
        });
        const loginRes = await request(app).post('/api/auth/login').send({
            email: adminEmail,
            password: 'Password123!'
        });
        token = loginRes.body.token;
        householdId = loginRes.body.household?.id;
        
        // Select household
        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${token}`);
    });

    afterAll(async () => {
        if (householdId) {
            await request(app).delete(`/api/households/${householdId}`).set('Authorization', `Bearer ${token}`);
        }
    });

    test('POST /shopping should create an item', async () => {
        const res = await request(app)
            .post(`/api/households/${householdId}/shopping`)
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                name: 'Milk', 
                category: 'dairy', 
                quantity: '2L', 
                emoji: '🥛' 
            });
        
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Milk');
        expect(res.body.category).toBe('dairy');
        itemId = res.body.id;
    });

    test('GET /shopping should list items', async () => {
        const res = await request(app)
            .get(`/api/households/${householdId}/shopping`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].name).toBe('Milk');
    });

    test('PUT /shopping/:id should update an item', async () => {
        const res = await request(app)
            .put(`/api/households/${householdId}/shopping/${itemId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                name: 'Almond Milk', 
                category: 'dairy', 
                quantity: '1L', 
                emoji: '🥛' 
            });
        
        expect(res.status).toBe(200);
        
        // Verify update
        const getRes = await request(app)
            .get(`/api/households/${householdId}/shopping`)
            .set('Authorization', `Bearer ${token}`);
        const item = getRes.body.find(i => i.id === itemId);
        expect(item.name).toBe('Almond Milk');
        expect(item.quantity).toBe('1L');
    });

    test('PUT /shopping/:id/toggle should toggle status', async () => {
        // Toggle ON
        let res = await request(app)
            .put(`/api/households/${householdId}/shopping/${itemId}/toggle`)
            .set('Authorization', `Bearer ${token}`)
            .send({ is_checked: true });
        expect(res.status).toBe(200);
        expect(res.body.is_checked).toBe(1);

        // Verify
        let getRes = await request(app).get(`/api/households/${householdId}/shopping`).set('Authorization', `Bearer ${token}`);
        let item = getRes.body.find(i => i.id === itemId);
        expect(item.is_checked).toBe(1);

        // Toggle OFF
        res = await request(app)
            .put(`/api/households/${householdId}/shopping/${itemId}/toggle`)
            .set('Authorization', `Bearer ${token}`)
            .send({ is_checked: false });
        expect(res.status).toBe(200);
        expect(res.body.is_checked).toBe(0);
    });

    test('DELETE /shopping/clear-completed should remove checked items', async () => {
        // Create a dummy completed item
        const createRes = await request(app)
            .post(`/api/households/${householdId}/shopping`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Bread', is_checked: true }); // Note: API might not accept is_checked on create, let's toggle it
        
        const tempId = createRes.body.id;
        await request(app)
            .put(`/api/households/${householdId}/shopping/${tempId}/toggle`)
            .set('Authorization', `Bearer ${token}`)
            .send({ is_checked: true });

        const res = await request(app)
            .delete(`/api/households/${householdId}/shopping/clear-completed`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.deleted).toBeGreaterThanOrEqual(1);

        // Verify Bread is gone but Almond Milk (unchecked) remains
        const getRes = await request(app).get(`/api/households/${householdId}/shopping`).set('Authorization', `Bearer ${token}`);
        expect(getRes.body.find(i => i.id === tempId)).toBeUndefined();
        expect(getRes.body.find(i => i.id === itemId)).toBeDefined();
    });

    test('DELETE /shopping/:id should delete an item', async () => {
        const res = await request(app)
            .delete(`/api/households/${householdId}/shopping/${itemId}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);

        const getRes = await request(app).get(`/api/households/${householdId}/shopping`).set('Authorization', `Bearer ${token}`);
        expect(getRes.body.find(i => i.id === itemId)).toBeUndefined();
    });
});
