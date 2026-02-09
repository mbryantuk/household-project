const request = require('supertest');
const { app } = require('../server');
const { globalDb, dbRun, dbGet } = require('../db');
const { generateSync } = require('otplib');
const bcrypt = require('bcryptjs');

describe('MFA Flow', () => {
    let userId;
    let token;
    let preAuthToken;
    let mfaSecret;

    const testEmail = 'mfa_test@example.com';
    const testPassword = 'Password123!';

    beforeAll(async () => {
        // Clean up and create test user
        await dbRun(globalDb, `DELETE FROM users WHERE email = ?`, [testEmail]);
        const passwordHash = bcrypt.hashSync(testPassword, 8);
        const res = await dbRun(globalDb, 
            `INSERT INTO users (email, password_hash, first_name, last_name, system_role, is_active) 
             VALUES (?, ?, 'MFA', 'Test', 'user', 1)`,
            [testEmail, passwordHash]
        );
        userId = res.id;

        // Login to get token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testEmail, password: testPassword });
        token = loginRes.body.token;
    });

    afterAll(async () => {
        await dbRun(globalDb, `DELETE FROM users WHERE email = ?`, [testEmail]);
    });

    test('Step 1: Setup MFA', async () => {
        const res = await request(app)
            .post('/api/auth/mfa/setup')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('secret');
        expect(res.body).toHaveProperty('qrCodeUrl');
        mfaSecret = res.body.secret;
    });

    test('Step 2: Verify MFA (Complete Setup)', async () => {
        const code = generateSync({ secret: mfaSecret });
        const res = await request(app)
            .post('/api/auth/mfa/verify')
            .set('Authorization', `Bearer ${token}`)
            .send({ code });
        
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('MFA enabled successfully');
        expect(res.body).toHaveProperty('recoveryCodes');
        expect(res.body.recoveryCodes).toHaveLength(10);
    });

    test('Step 3: Login with MFA requirement', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testEmail, password: testPassword });
        
        expect(res.status).toBe(200);
        expect(res.body.mfa_required).toBe(true);
        expect(res.body).toHaveProperty('preAuthToken');
        preAuthToken = res.body.preAuthToken;
    });

    test('Step 4: Complete MFA Login', async () => {
        const code = generateSync({ secret: mfaSecret });
        const res = await request(app)
            .post('/api/auth/mfa/login')
            .send({ preAuthToken, code });
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.mfa_enabled).toBe(true);
    });

    test('Step 5: Login with Recovery Code', async () => {
        // Get recovery codes
        const user = await dbGet(globalDb, `SELECT mfa_recovery_codes FROM users WHERE id = ?`, [userId]);
        const { decrypt } = require('../services/crypto');
        const recoveryCodes = JSON.parse(decrypt(user.mfa_recovery_codes));
        const recoveryCode = recoveryCodes[0];

        // Get new preAuthToken
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testEmail, password: testPassword });
        const newPreAuthToken = loginRes.body.preAuthToken;

        const res = await request(app)
            .post('/api/auth/mfa/login')
            .send({ preAuthToken: newPreAuthToken, code: recoveryCode });
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');

        // Verify code was removed
        const userAfter = await dbGet(globalDb, `SELECT mfa_recovery_codes FROM users WHERE id = ?`, [userId]);
        const recoveryCodesAfter = JSON.parse(decrypt(userAfter.mfa_recovery_codes));
        expect(recoveryCodesAfter).not.toContain(recoveryCode);
        expect(recoveryCodesAfter).toHaveLength(9);
    });

    test('Step 6: Disable MFA', async () => {
        const res = await request(app)
            .post('/api/auth/mfa/disable')
            .set('Authorization', `Bearer ${token}`)
            .send({ password: testPassword });
        
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('MFA disabled');

        const user = await dbGet(globalDb, `SELECT mfa_enabled FROM users WHERE id = ?`, [userId]);
        expect(user.mfa_enabled).toBe(0);
    });
});