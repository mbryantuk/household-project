const request = require('supertest');
const { app } = require('../../server');

describe('Viewer Role Restrictions', () => {
    jest.setTimeout(30000);
    const uniqueId = Date.now();
    let householdId = null;
    let adminToken = '';
    let viewerToken = '';

    beforeAll(async () => {
        // 1. Register Household
        await request(app).post('/auth/register').send({
            householdName: 'Viewer Test', email: `admin_${uniqueId}@test.com`, password: 'password', firstName: 'Admin'
        });
        const loginA = await request(app).post('/auth/login').send({ email: `admin_${uniqueId}@test.com`, password: 'password' });
        adminToken = loginA.body.token;
        householdId = loginA.body.household?.id || loginA.body.tokenPayload?.householdId;

        if (!householdId) {
            const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${adminToken}`);
            householdId = profile.body.default_household_id;
        }

        // 2. Create Viewer
        await request(app).post(`/households/${householdId}/users`).set('Authorization', `Bearer ${adminToken}`).send({
            email: `viewer_${uniqueId}@test.com`, role: 'viewer', password: 'password'
        });
        const loginV = await request(app).post('/auth/login').send({ email: `viewer_${uniqueId}@test.com`, password: 'password' });
        viewerToken = loginV.body.token;
    });

    const endpoints = [
        { path: 'assets', method: 'post', payload: { name: 'Test' }, label: 'Assets' },
        { path: 'vehicles', method: 'post', payload: { make: 'Test' }, label: 'Vehicles' },
        { path: 'members', method: 'post', payload: { name: 'Test', type: 'adult' }, label: 'Members' },
        { path: 'energy', method: 'post', payload: { provider: 'Test' }, label: 'Energy' },
        { path: 'costs', method: 'post', payload: { name: 'Test', amount: 10, parent_type: 'general' }, label: 'Costs' },
        { path: 'waste', method: 'post', payload: { waste_type: 'Test', frequency: 'Weekly', collection_day: 'Monday' }, label: 'Waste' }
    ];

    endpoints.forEach(ep => {
        it(`should block VIEWER from creating ${ep.label}`, async () => {
            const res = await request(app)
                [ep.method](`/households/${householdId}/${ep.path}`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .send(ep.payload);
            expect(res.status).toBe(403);
        });
    });

    it('should block VIEWER from updating household details', async () => {
        const res = await request(app)
            .put(`/households/${householdId}/details`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ property_type: 'Hacked' });
        expect(res.status).toBe(403);
    });
});