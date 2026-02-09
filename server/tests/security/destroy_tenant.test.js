const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('../../server');
const { globalDb, dbRun, dbGet } = require('../../db');

const ADMIN_EMAIL = `destroy_test_${Date.now()}@test.com`;
const PASSWORD = "Password123!";
const DATA_DIR = path.join(__dirname, '../../data');
const BACKUP_DIR = path.join(__dirname, '../../backups');

describe('💣 Tenant Destruction & Cleanup', () => {
    jest.setTimeout(60000); 

    let token;
    let householdId;
    let backupFilename;

    beforeAll(async () => {
        // 1. Setup: Create User & Household
        await request(app).post('/api/auth/register').send({ householdName: 'Doom Household', email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
        const login = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
        token = login.body.token;
        householdId = login.body.user.default_household_id;
        
        if (!householdId) {
             const hList = await request(app).get('/api/auth/my-households').set('Authorization', `Bearer ${token}`);
             householdId = hList.body[0]?.id;
        }

        // Ensure context
        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${token}`);
    });

    afterAll(async () => {
        // Cleanup if test fails (safe delete)
        if (server && server.close) server.close();
    });

    test('🧨 Destroy Tenant: Should remove all traces (DB, Files, Backups)', async () => {
        // A. Setup Artifacts
        // 1. Create a Backup
        const bRes = await request(app).post(`/api/households/${householdId}/backups`).set('Authorization', `Bearer ${token}`);
        expect(bRes.status).toBe(200);
        backupFilename = bRes.body.filename;
        expect(fs.existsSync(path.join(BACKUP_DIR, backupFilename))).toBe(true);

        // 2. Verify Tenant DB exists
        const dbPath = path.join(DATA_DIR, `household_${householdId}.db`);
        expect(fs.existsSync(dbPath)).toBe(true);

        // B. Execute Destruction
        const delRes = await request(app).delete(`/api/households/${householdId}`).set('Authorization', `Bearer ${token}`);
        expect(delRes.status).toBe(200);
        expect(delRes.body.message).toContain('destroyed');

        // C. Verify Destruction
        // 1. Check Global Tables
        const hhRow = await dbGet(globalDb, "SELECT * FROM households WHERE id = ?", [householdId]);
        expect(hhRow).toBeUndefined();

        const uhRow = await dbGet(globalDb, "SELECT * FROM user_households WHERE household_id = ?", [householdId]);
        expect(uhRow).toBeUndefined();

        // 2. Check File System
        expect(fs.existsSync(dbPath)).toBe(false); // DB File gone
        expect(fs.existsSync(path.join(BACKUP_DIR, backupFilename))).toBe(false); // Backup File gone
    });
});
