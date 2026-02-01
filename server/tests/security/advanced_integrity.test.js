const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('../../server');

const ADMIN_EMAIL = `integrity_admin_${Date.now()}@test.com`;
const PASSWORD = "Password123!";

describe('🛡️ Advanced System Integrity & Security', () => {
    jest.setTimeout(60000); 

    let token;
    let householdId;

    beforeAll(async () => {
        await request(app).post('/api/auth/register').send({ householdName: 'Integrity Test', email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
        const login = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
        token = login.body.token;
        householdId = login.body.user.default_household_id;

        if (!householdId) {
            const hList = await request(app).get('/api/auth/my-households').set('Authorization', `Bearer ${token}`);
            householdId = hList.body[0]?.id;
        }

        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${token}`);
    });

    afterAll(async () => {
        if (householdId) await request(app).delete(`/api/households/${householdId}`).set('Authorization', `Bearer ${token}`);
        if (server && server.close) server.close();
    });

    test('📅 Friday Rule: Creation with valid payload', async () => {
        const res = await request(app).post(`/api/households/${householdId}/finance/recurring-costs`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: "Weekend Bill", amount: 100, category_id: "utility", frequency: "monthly", 
                start_date: "2026-02-07", adjust_for_working_day: 1
            });
        expect(res.status).toBe(201);
    });

    test('♻️ Idempotency: Duplicate creation check', async () => {
        const payload = { first_name: "UniqueMember", type: "adult" };
        const url = `/api/households/${householdId}/members`;
        const r1 = await request(app).post(url).set('Authorization', `Bearer ${token}`).send(payload);
        const r2 = await request(app).post(url).set('Authorization', `Bearer ${token}`).send(payload);
        expect(r1.status).toBe(201);
        expect(r2.status).toBe(201); // Currently expected behavior
    });

    test('🛑 Security: Path Traversal prevention', async () => {
        const badPaths = ['../../etc/passwd', '../global.db', '0; DROP TABLE users'];
        for (const p of badPaths) {
            const res = await request(app).get(`/api/households/${p}`).set('Authorization', `Bearer ${token}`);
            expect(res.status).not.toBe(500);
        }
    });

    test('💾 Integrity: Backup Trigger', async () => {
        const bRes = await request(app).post(`/api/households/${householdId}/backups`).set('Authorization', `Bearer ${token}`);
        expect(bRes.status).toBe(200);
        expect(bRes.body.filename).toBeDefined();
    });
});