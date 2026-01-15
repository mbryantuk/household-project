const request = require('supertest');
const { app } = require('../../server');

describe('🛡️ Role Matrix Completion: Member Constraints', () => {
    jest.setTimeout(30000);
    const uniqueId = Date.now();
    let householdId = null;
    let adminToken = '';
    let memberToken = '';

    beforeAll(async () => {
        // 1. Register Household
        const reg = await request(app).post('/auth/register').send({
            householdName: 'Member Constraint Test', email: `admin_mc_${uniqueId}@test.com`, password: 'password', firstName: 'Admin'
        });
        const loginA = await request(app).post('/auth/login').send({ email: `admin_mc_${uniqueId}@test.com`, password: 'password' });
        adminToken = loginA.body.token;
        householdId = loginA.body.household?.id;

        // 2. Create Member
        await request(app).post(`/households/${householdId}/users`).set('Authorization', `Bearer ${adminToken}`).send({
            email: `member_mc_${uniqueId}@test.com`, role: 'member', password: 'password'
        });
        const loginM = await request(app).post('/auth/login').send({ email: `member_mc_${uniqueId}@test.com`, password: 'password' });
        memberToken = loginM.body.token;
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
        it(`should ALLOW MEMBER to create ${ep.label} (Write Allowed per Gemini.md)`, async () => {
            const res = await request(app)
                [ep.method](`/households/${householdId}/${ep.path}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send(ep.payload);
            expect(res.status).toBe(200);
        });
    });

    it('should ALLOW MEMBER to update household details (Write Allowed per Gemini.md)', async () => {
        const res = await request(app)
            .put(`/households/${householdId}/details`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ property_type: 'Updated' });
        expect(res.status).toBe(200);
    });
});