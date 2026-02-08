const request = require('supertest');
const { app, server } = require('../../server');
const otplib = require('otplib');
const crypto = require('crypto');

// 🛠️ CRITICAL: Unmock otplib to verify REAL logic + Encryption
jest.unmock('otplib');
jest.unmock('qrcode');

describe('🔐 MFA (Multi-Factor Authentication) Integrity', () => {
    let adminToken;
    let userId;
    let mfaSecret;
    let preAuthToken;

    const testUser = {
        householdName: 'MFA Fortress',
        email: `mfa_test_${Date.now()}@test.com`,
        password: 'Password123!',
        firstName: 'MFA',
        lastName: 'Tester'
    };

    beforeAll(async () => {
        // Register
        const res = await request(app).post('/api/auth/register').send(testUser);
        expect(res.status).toBe(201);

        // Initial Login
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });
        expect(loginRes.status).toBe(200);
        adminToken = loginRes.body.token;
        userId = loginRes.body.user.id;
    });

    afterAll(() => {
        if (server) server.close();
    });

    test('1️⃣ Setup MFA (Should return Secret + QR)', async () => {
        const res = await request(app).post('/api/auth/mfa/setup')
            .set('Authorization', `Bearer ${adminToken}`);
        
        if (res.status !== 200) console.error("Setup MFA Failed:", res.body);
        expect(res.status).toBe(200);
        expect(res.body.secret).toBeDefined();
        expect(res.body.qrCodeUrl).toBeDefined();
        mfaSecret = res.body.secret; // Save for verification
    });

    test('2️⃣ Verify MFA (Should enable MFA)', async () => {
        const code = await otplib.generate({ secret: mfaSecret });
        const res = await request(app).post('/api/auth/mfa/verify')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code });

        if (res.status !== 200) console.error("Verify MFA Failed:", res.body);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('enabled');
    });

    test('3️⃣ Login should now require MFA', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });

        expect(res.status).toBe(200);
        expect(res.body.mfa_required).toBe(true);
        expect(res.body.preAuthToken).toBeDefined();
        preAuthToken = res.body.preAuthToken;
    });

    test('4️⃣ MFA Login with INVALID code should fail', async () => {
        const res = await request(app).post('/api/auth/mfa/login').send({
            preAuthToken,
            code: '000000'
        });

        expect(res.status).toBe(401);
    });

    test('5️⃣ MFA Login with VALID code should succeed', async () => {
        const code = await otplib.generate({ secret: mfaSecret });
        const res = await request(app).post('/api/auth/mfa/login').send({
            preAuthToken,
            code
        });

        if (res.status !== 200) console.error("MFA Login Failed:", res.body);
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        adminToken = res.body.token; // Refresh token
    });

    test('6️⃣ Disable MFA', async () => {
        const res = await request(app).post('/api/auth/mfa/disable')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ password: testUser.password });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('disabled');
    });

    test('7️⃣ Login should NOT require MFA anymore', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });

        expect(res.status).toBe(200);
        expect(res.body.mfa_required).toBeFalsy();
        expect(res.body.token).toBeDefined();
    });
});