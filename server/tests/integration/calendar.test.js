const request = require('supertest');
const { app } = require('../../server');

describe('Feature: Calendar & Events', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let token = '';
    let householdId = null;

    beforeAll(async () => {
        const reg = await request(app).post('/auth/register').send({
            householdName: `CalendarTest_${uniqueId}`,
            email: `cal_${uniqueId}@test.com`,
            password: 'password',
            firstName: 'CalAdmin'
        });
        
        const login = await request(app).post('/auth/login').send({ email: `cal_${uniqueId}@test.com`, password: 'password' });
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

    describe('Events', () => {
        let eventId;
        it('should create an event', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Test Party',
                    date: '2025-12-31',
                    type: 'event',
                    emoji: '🎉'
                });
            expect(res.statusCode).toBe(200);
            eventId = res.body.id;
        });

        it('should retrieve events', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.some(e => e.id === eventId)).toBe(true);
        });

        it('should update the event', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/dates/${eventId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'New Years Eve' });
            expect(res.statusCode).toBe(200);
        });

        it('should delete the event', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}/dates/${eventId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
        });
    });
});
