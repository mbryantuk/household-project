const request = require('supertest');
const { app } = require('../server');

describe('Viewer Restriction Enforcement', () => {
    let sysAdminToken = '';
    let householdId = null;
    let viewerToken = '';
    const uniqueId = Date.now();

    beforeAll(async () => {
        // 1. Login as SysAdmin
        const loginRes = await request(app).post('/auth/login').send({ username: 'superuser', password: 'superpassword' });
        sysAdminToken = loginRes.body.token;

        // 2. Create Household
        const hhRes = await request(app).post('/admin/households').set('Authorization', `Bearer ${sysAdminToken}`).send({
            name: `ViewerTest_${uniqueId}`,
            adminPassword: 'password123',
            adminEmail: `admin_${uniqueId}@test.com`
        });
        householdId = hhRes.body.householdId;

        // 3. Create Viewer User
        const viewerRes = await request(app).post('/admin/create-user').set('Authorization', `Bearer ${sysAdminToken}`).send({
            email: `viewer_${uniqueId}@test.com`,
            password: 'password123',
            role: 'viewer',
            householdId: householdId,
            username: `viewer_${uniqueId}`
        });

        // 4. Login as Viewer
        const vLogin = await request(app).post('/auth/login').send({ email: `viewer_${uniqueId}@test.com`, password: 'password123' });
        viewerToken = vLogin.body.token;
    });

    const endpoints = [
        { path: `/households/${householdId}/assets`, data: { name: 'Forbidden' } },
        { path: `/households/${householdId}/vehicles`, data: { make: 'No', model: 'Access' } },
        { path: `/households/${householdId}/members`, data: { name: 'Stealth' } },
        { path: `/households/${householdId}/dates`, data: { title: 'Ghost', date: '2025-01-01' } },
        { path: `/households/${householdId}/costs`, data: { name: 'Invisible', amount: 0, parent_type: 'general' } }
    ];

    endpoints.forEach(ep => {
        it(`should allow Viewer to READ ${ep.path}`, async () => {
            const res = await request(app).get(ep.path).set('Authorization', `Bearer ${viewerToken}`);
            expect(res.statusCode).toBe(200);
        });

        it(`should FORBID Viewer from POSTing to ${ep.path}`, async () => {
            const res = await request(app).post(ep.path).set('Authorization', `Bearer ${viewerToken}`).send(ep.data);
            expect(res.statusCode).toBe(403);
        });

        it(`should FORBID Viewer from PUTting to ${ep.path}`, async () => {
            const res = await request(app).put(`${ep.path}/1`).set('Authorization', `Bearer ${viewerToken}`).send(ep.data);
            expect(res.statusCode).toBe(403);
        });

        it(`should FORBID Viewer from DELETING ${ep.path}`, async () => {
            const res = await request(app).delete(`${ep.path}/1`).set('Authorization', `Bearer ${viewerToken}`);
            expect(res.statusCode).toBe(403);
        });
    });
});
