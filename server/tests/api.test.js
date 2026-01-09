const request = require('supertest');
const { app, globalDb } = require('../server');

describe('Household Project API Integration Suite (Isolated Tenancy)', () => {
    let sysAdminToken = '';
    let localAdminToken = '';
    let accessKey = '';
    let householdId = null;
    let memberId = null;
    let createdUserId = null;
    let reportSummary = [];

    const sysAdmin = {
        username: 'superuser',
        password: 'superpassword'
    };

    const newHousehold = {
        name: `Test Manor ${Date.now()}`,
        adminUsername: 'TestAdmin',
        adminPassword: 'password123'
    };

    const secondaryUser = {
        username: `user_${Date.now()}`,
        password: 'Password123!',
        role: 'viewer'
    };

    // Helper to log results
    const logToReport = (action, endpoint, status) => {
        reportSummary.push({ Action: action, Endpoint: endpoint, Result: status });
    };

    afterAll((done) => {
        console.log("\n--- AUTOMATED API EXECUTION REPORT ---");
        console.table(reportSummary);
        done();
    });

    // --- 1. SYSADMIN OPERATIONS ---
    describe('SysAdmin Operations', () => {
        it('should login as Superuser (SysAdmin)', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ username: sysAdmin.username, password: sysAdmin.password });
            
            sysAdminToken = res.body.token;
            logToReport('SysAdmin Login', '/auth/login', sysAdminToken ? '✅ Token Received' : '❌ Failed');
            
            expect(res.statusCode).toBe(200);
            expect(res.body.role).toBe('sysadmin');
        });

        it('should create a new household (Tenant)', async () => {
            const res = await request(app)
                .post('/admin/households')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .send(newHousehold);
            
            householdId = res.body.householdId;
            accessKey = res.body.accessKey;
            
            logToReport('Create Household', '/admin/households', accessKey ? `✅ Key: ${accessKey}` : '❌ Failed');
            
            expect(res.statusCode).toBe(200);
            expect(accessKey).toBeDefined();
        });

        it('should list backups (SysAdmin only)', async () => {
            const res = await request(app)
                .get('/admin/backups')
                .set('Authorization', `Bearer ${sysAdminToken}`);
            
            logToReport('List Backups', '/admin/backups', res.statusCode === 200 ? '✅ Access Granted' : '❌ Failed');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
        });

        it('should access Swagger UI', async () => {
            const res = await request(app)
                .get('/api-docs/')
                .redirects(1); // Swagger UI might redirect

            logToReport('Access Swagger UI', '/api-docs/', res.statusCode === 200 ? '✅ Accessible' : '❌ Failed');
            expect(res.statusCode).toBe(200);
            // Check for some HTML content common in Swagger UI
            expect(res.text).toContain('swagger');
        });
    });

    // --- 2. HOUSEHOLD OPERATIONS ---
    describe('Household Operations (Local Admin)', () => {
        it('should login as the new Local Admin using Access Key', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ 
                    accessKey: accessKey,
                    username: newHousehold.adminUsername, 
                    password: newHousehold.adminPassword 
                });
            
            localAdminToken = res.body.token;
            logToReport('Local Admin Login', '/auth/login', localAdminToken ? '✅ Token Received' : '❌ Failed');
            
            expect(res.statusCode).toBe(200);
            expect(res.body.context).toBe('household');
        });

        it('should add a resident (member) to the household', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/members`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ 
                    name: 'Test Resident', 
                    type: 'adult', 
                    notes: 'Created by test' 
                });
            
            memberId = res.body.id;
            logToReport('Add Resident', `/households/${householdId}/members`, memberId ? `✅ ID: ${memberId}` : '❌ Failed');
            
            expect(res.statusCode).toBe(200);
        });

        it('should list all residents', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/members`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            
            logToReport('List Residents', `/households/${householdId}/members`, res.body.length > 0 ? '✅ Found' : '❌ Empty');
            expect(res.statusCode).toBe(200);
        });
        
        it('should create a local user', async () => {
            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ username: `user_${Date.now()}`, password: "password123", householdId: householdId });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('id');
            createdUserId = res.body.id;
            logToReport('Create Local User', '/admin/create-user', `✅ ID: ${createdUserId}`);
        });

        it('should create a recurring event', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ 
                    title: "Weekly Meeting", 
                    date: "2024-01-01", 
                    recurrence: "weekly",
                    emoji: "📅"
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body.recurrence).toBe('weekly');
            logToReport('Create Recurring Event', `/households/${householdId}/dates`, `✅ ID: ${res.body.id}`);
        });

        it('should list local users', async () => {
            const res = await request(app)
                .get('/admin/users')
                .set('Authorization', `Bearer ${localAdminToken}`)
                .query({ householdId }); // Local admins send this implicitly via token, but test uses query or assumes token context

            logToReport('List Local Users', '/admin/users', res.body.length > 0 ? '✅ Found' : '❌ Empty');
            expect(res.statusCode).toBe(200);
        });
    });
});