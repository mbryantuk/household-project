const request = require('supertest');
const app = require('../../App');
const { globalDb, dbRun } = require('../../db');

describe('🛡️ Tenant Export Verification', () => {
    let adminToken;
    let householdId;
    let adminUser;

    beforeAll(async () => {
        const uniqueEmail = `admin_export_${Date.now()}@test.com`;
        // 1. Register a user
        await request(app).post('/api/auth/register').send({ 
            householdName: 'Export Test House', 
            email: uniqueEmail, 
            password: 'Password123!',
            firstName: 'Admin',
            lastName: 'User'
        });

        // 2. Promote to System Admin in DB
        await dbRun(globalDb, "UPDATE users SET system_role = 'admin' WHERE email = ?", [uniqueEmail]);

        // 3. Login to get token
        const loginRes = await request(app).post('/api/auth/login').send({ 
            email: uniqueEmail, 
            password: 'Password123!' 
        });
        
        adminToken = loginRes.body.token;
        adminUser = loginRes.body.user;
        householdId = loginRes.body.household.id;
    });

    afterAll(async () => {
        // No server to close if using app directly from App.js
    });

    test('GET /api/admin/households/:id/export should return a backup filename (System Admin)', async () => {
        const res = await request(app)
            .get(`/api/admin/households/${householdId}/export`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Export ready');
        expect(res.body.filename).toBeDefined();
        expect(res.body.filename).toContain(`household-${householdId}`);
    });

    test('Non-system-admin should not be able to export (even if household admin)', async () => {
        // A regular user registered via /auth/register is a household admin but NOT a system admin
        const userEmail = `user_export_${Date.now()}@test.com`;
        await request(app).post('/api/auth/register').send({ 
            householdName: 'User House', 
            email: userEmail, 
            password: 'Password123!' 
        });
        const loginRes = await request(app).post('/api/auth/login').send({ 
            email: userEmail, 
            password: 'Password123!' 
        });
        const userToken = loginRes.body.token;

        const res = await request(app)
            .get(`/api/admin/households/${householdId}/export`)
            .set('Authorization', `Bearer ${userToken}`);
        
        expect(res.status).toBe(403);
    });

    test('Export should contain manifest.json in the zip', async () => {
        const res = await request(app)
            .get(`/api/admin/households/${householdId}/export`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        const filename = res.body.filename;
        const path = require('path');
        const fs = require('fs');
        const admZip = require('adm-zip');
        const backupDir = path.join(__dirname, '../../backups');
        const filePath = path.join(backupDir, filename);

        expect(fs.existsSync(filePath)).toBe(true);
        const zip = new admZip(filePath);
        const zipEntries = zip.getEntries();
        const hasManifest = zipEntries.some(e => e.entryName === 'manifest.json');
        const hasDb = zipEntries.some(e => e.entryName === `household_${householdId}.db`);

        expect(hasManifest).toBe(true);
        expect(hasDb).toBe(true);

        const manifestContent = JSON.parse(zip.readAsText('manifest.json'));
        expect(manifestContent.household.id).toBe(householdId);
        expect(manifestContent.users.length).toBeGreaterThan(0);
    });
});
