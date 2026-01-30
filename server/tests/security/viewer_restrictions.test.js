const request = require('supertest');
const { app } = require('../../server');
const pkg = require('../../../package.json');

describe('Viewer Role Restrictions', () => {
    jest.setTimeout(30000);
    const uniqueId = Date.now();
    const householdName = `Viewer Test (v${pkg.version})`;
    let householdId = null;
    let adminToken = '';
    let viewerToken = '';

    beforeAll(async () => {
        // 1. Register Household
        await request(app).post('/auth/register').send({
            householdName: householdName, email: `admin_${uniqueId}@test.com`, password: 'password', firstName: 'Admin'
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

    const RESTRICTED_POSTS = [
        { path: 'members', method: 'post', payload: { name: 'New Member', type: 'adult' }, label: 'Member' },
        { path: 'assets', method: 'post', payload: { name: 'New Asset' }, label: 'Asset' },
        { path: 'vehicles', method: 'post', payload: { make: 'New Vehicle' }, label: 'Vehicle' },
        { path: 'energy', method: 'post', payload: { provider: 'New Energy' }, label: 'Energy' },
        { path: 'finance/charges', method: 'post', payload: { name: 'New Charge', amount: 10, frequency: 'monthly', segment: 'other' }, label: 'Charge' },
        { path: 'finance/income', method: 'post', payload: { employer: 'New Job', amount: 1000 }, label: 'Income' },
        { path: 'waste', method: 'post', payload: { waste_type: 'Test', frequency: 'Weekly', collection_day: 'Monday' }, label: 'Waste' }
    ];

    RESTRICTED_POSTS.forEach(ep => {
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