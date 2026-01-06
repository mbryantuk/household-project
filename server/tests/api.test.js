const request = require('supertest');
const { app, globalDb } = require('../server');

describe('Household Project API Integration Suite', () => {
    let authToken = '';
    let householdId = null;
    let memberId = null;
    let reportSummary = [];

    // Unique credentials for this test run to avoid UNIQUE constraint errors
    const testUser = {
        username: `tester_${Date.now()}`,
        password: 'Password123!',
        email: `test_${Date.now()}@example.com`,
        secretCode: 'MakeMeGod' // This grants 'sysadmin' role per your auth.js logic
    };

    // Helper to log results for our report
    const logToReport = (action, endpoint, status) => {
        reportSummary.push({ Action: action, Endpoint: endpoint, Result: status });
    };

    /**
     * TEARDOWN: Runs after all tests are finished.
     * Prints the final report and cleans up the test user.
     */
    afterAll((done) => {
        console.log("\n--- AUTOMATED API EXECUTION REPORT ---");
        console.table(reportSummary);
        
        if (globalDb) {
            globalDb.run("DELETE FROM users WHERE username = ?", [testUser.username], () => {
                done();
            });
        } else {
            done();
        }
    });

    // --- 1. AUTHENTICATION TESTS ---
    describe('Auth Routes', () => {
        it('should register a new sysadmin user', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send(testUser);
            
            logToReport('User Registration', '/auth/register', res.statusCode === 200 ? '✅ Created' : '❌ Failed');
            expect(res.statusCode).toBe(200);
            expect(res.body.system_role).toBe('sysadmin');
        });

        it('should login and retrieve a JWT token', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ username: testUser.username, password: testUser.password });
            
            authToken = res.body.token;
            logToReport('User Login', '/auth/login', authToken ? '✅ Token Received' : '❌ Failed');
            
            expect(res.statusCode).toBe(200);
            expect(authToken).toBeDefined();
        });
    });

    // --- 2. HOUSEHOLD TESTS ---
    describe('Household Routes', () => {
        it('should create a new household', async () => {
            const res = await request(app)
                .post('/households')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test Manor', theme: 'modern' });
            
            householdId = res.body.householdId;
            logToReport('Create Household', '/households', householdId ? `✅ ID: ${householdId}` : '❌ Failed');
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Household created");
        });

        it('should list my households', async () => {
            const res = await request(app)
                .get('/my-households')
                .set('Authorization', `Bearer ${authToken}`);
            
            logToReport('List Households', '/my-households', res.body.length > 0 ? '✅ Found' : '❌ Empty');
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // --- 3. MEMBER TESTS ---
    describe('Member Routes', () => {
        it('should add a member to the specific household', async () => {
            // Testing the route defined in routes/members.js
            const res = await request(app)
                .post(`/households/${householdId}/members`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ 
                    name: 'Test Member', 
                    type: 'adult', 
                    notes: 'Created by automation' 
                });
            
            memberId = res.body.id;
            logToReport('Add Member', `/households/:id/members`, memberId ? `✅ ID: ${memberId}` : '❌ Failed');
            
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe('Test Member');
        });

        it('should list all members for the household', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/members`)
                .set('Authorization', `Bearer ${authToken}`);
            
            logToReport('List Members', `/households/:id/members`, res.body.length > 0 ? '✅ Found' : '❌ Empty');
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});