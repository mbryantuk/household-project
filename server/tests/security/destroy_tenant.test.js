const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('../../server');
const { globalDb, dbRun, dbGet } = require('../../db');

const ADMIN_EMAIL = `destroy_test_${Date.now()}@test.com`;
const SYS_ADMIN_EMAIL = `sysadmin_${Date.now()}@test.com`;
const PASSWORD = "Password123!";
const DATA_DIR = path.join(__dirname, '../../data');
const BACKUP_DIR = path.join(__dirname, '../../backups');

describe('💣 Tenant Destruction & Cleanup', () => {
    jest.setTimeout(60000); 

    let token;
    let sysAdminToken;
    let userId;
    let householdId;

    beforeAll(async () => {
        // 1. Setup: Create User & Household
        await request(app).post('/api/auth/register').send({ householdName: 'Doom Household', email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
        const login = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
        token = login.body.token;
        userId = login.body.user.id;
        
        const hList = await request(app).get('/api/auth/my-households').set('Authorization', `Bearer ${token}`);
        householdId = hList.body[0]?.id;

        // 2. Setup: Create System Admin
        await request(app).post('/api/auth/register').send({ householdName: 'Admin HH', email: SYS_ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
        await dbRun(globalDb, `UPDATE users SET system_role = 'admin' WHERE email = ?`, [SYS_ADMIN_EMAIL]);
        
        const sysLoginReal = await request(app).post('/api/auth/login').send({ email: SYS_ADMIN_EMAIL, password: PASSWORD });
        sysAdminToken = sysLoginReal.body.token;

        // Ensure context for regular user
        if (householdId) {
            await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${token}`);
        }
    });

    afterAll(async () => {
        if (server && server.close) server.close();
    });

    test('🧨 Destroy Tenant: Regular Admin should remove all traces', async () => {
        const email = `reg_${Date.now()}@test.com`;
        await request(app).post('/api/auth/register').send({ householdName: 'Regular Destruct HH', email: email, password: PASSWORD, is_test: 1 });
        const login2 = await request(app).post('/api/auth/login').send({ email: email, password: PASSWORD });
        const actualToken = login2.body.token;
        
        const hList = await request(app).get('/api/auth/my-households').set('Authorization', `Bearer ${actualToken}`);
        const hhId = hList.body[0]?.id;

        // Verify Tenant DB exists
        const dbPath = path.join(DATA_DIR, `household_${hhId}.db`);
        expect(fs.existsSync(dbPath)).toBe(true);

        // Execute Destruction
        const delRes = await request(app).delete(`/api/households/${hhId}`).set('Authorization', `Bearer ${actualToken}`);
        expect(delRes.status).toBe(200);

        // Verify Destruction
        const hhRow = await dbGet(globalDb, "SELECT * FROM households WHERE id = ?", [hhId]);
        expect(hhRow).toBeUndefined();
        expect(fs.existsSync(dbPath)).toBe(false);
    });

    test('👑 Destroy Tenant: System Admin should be able to destroy ANY household', async () => {
        // 1. regular user creates a household
        const otherUserEmail = `target_${Date.now()}@test.com`;
        await request(app).post('/api/auth/register').send({ householdName: 'Target HH', email: otherUserEmail, password: PASSWORD, is_test: 1 });
        
        // Find the household ID
        const targetHhRow = await dbGet(globalDb, "SELECT id FROM households WHERE name = 'Target HH' ORDER BY created_at DESC LIMIT 1");
        const targetHhId = targetHhRow.id;
        
        const targetDbPath = path.join(DATA_DIR, `household_${targetHhId}.db`);
        expect(fs.existsSync(targetDbPath)).toBe(true);

        // 2. System Admin (who is NOT a member) tries to delete it
        const delRes = await request(app).delete(`/api/households/${targetHhId}`).set('Authorization', `Bearer ${sysAdminToken}`);
        
        expect(delRes.status).toBe(200);
        expect(delRes.body.message).toContain('destroyed');

        // 3. Verify gone
        const hhRow = await dbGet(globalDb, "SELECT * FROM households WHERE id = ?", [targetHhId]);
        expect(hhRow).toBeUndefined();
        expect(fs.existsSync(targetDbPath)).toBe(false);
    });
});
