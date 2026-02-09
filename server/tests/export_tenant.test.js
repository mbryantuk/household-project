const request = require('supertest');
const { app, server } = require('../server');

describe('📦 Export Tenant Verification', () => {
    let householdId;
    let token;
    let adminEmail = `admin_export_${Date.now()}@test.com`;
    let backupFilename;

    beforeAll(async () => {
        // Register and login to get a token and household ID
        const regRes = await request(app).post('/api/auth/register').send({
            householdName: 'Export House',
            email: adminEmail,
            password: 'Password123!'
        });
        
        const loginRes = await request(app).post('/api/auth/login').send({
            email: adminEmail,
            password: 'Password123!'
        });
        token = loginRes.body.token;
        householdId = loginRes.body.household?.id;
        
        // Select household
        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${token}`);
    });

    afterAll(async () => {
        if (householdId) {
            await request(app).delete(`/api/households/${householdId}`).set('Authorization', `Bearer ${token}`);
        }
        if (server && server.close) server.close();
    });

    test('POST /api/households/:id/backups should create a backup', async () => {
        const res = await request(app)
            .post(`/api/households/${householdId}/backups`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Household backup created");
        expect(res.body.filename).toBeDefined();
        expect(res.body.filename).toMatch(new RegExp(`^household-${householdId}-backup-`));
        
        backupFilename = res.body.filename;
    });

    test('GET /api/households/:id/backups should list the new backup', async () => {
        const res = await request(app)
            .get(`/api/households/${householdId}/backups`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const backup = res.body.find(b => b.filename === backupFilename);
        expect(backup).toBeDefined();
    });

    test('GET /api/households/:id/backups/:filename should download the file', async () => {
        const res = await request(app)
            .get(`/api/households/${householdId}/backups/${backupFilename}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.header['content-type']).toBe('application/zip');
    });

    test('GET /api/households/:id/backups/:filename should fail for mismatched household', async () => {
        const fakeFilename = `household-999999-backup-fake.zip`;
        const res = await request(app)
            .get(`/api/households/${householdId}/backups/${fakeFilename}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(403); // Should match the route logic
    });

    test('GET /api/households/:id/backups/:filename should fail for non-existent file', async () => {
        // Correct prefix, but random timestamp
        const fakeFilename = `household-${householdId}-backup-999999.zip`;
        const res = await request(app)
            .get(`/api/households/${householdId}/backups/${fakeFilename}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(404);
    });
});
