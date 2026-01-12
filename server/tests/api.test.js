const request = require('supertest');
const { app } = require('../server');

describe('Household Project API Integration Suite (Admin-First)', () => {
    jest.setTimeout(30000);
    
    // Household Data
    let householdId = null;
    let accessKey = '';
    const uniqueId = Date.now();
    const householdName = `Manor ${uniqueId}`;
    const adminEmail = `admin_${uniqueId}@example.com`;
    const adminPassword = 'password123';

    // Users to Create & Test
    let users = {
        member: { id: null, token: '', creds: { username: 'TestMember', email: `TestMember_${uniqueId}@example.com`, password: 'password123', role: 'member' } },
        viewer: { id: null, token: '', creds: { username: 'TestViewer', email: `TestViewer_${uniqueId}@example.com`, password: 'password123', role: 'viewer' } }
    };
    let localAdminToken = ''; 

    // Members (Residents)
    let residents = {
        adult: { id: null, data: { name: 'Dad', type: 'adult', emoji: '👨', dob: '1980-01-01' } },
        child: { id: null, data: { name: 'Junior', type: 'child', dob: '2015-05-20', emoji: '👦' } },
        pet: { id: null, data: { name: 'Rex', type: 'pet', species: 'Dog', emoji: '🐶' } }
    };

    // Events
    let eventId = null;

    let reportSummary = [];
    const logToReport = (action, endpoint, status) => {
        reportSummary.push({ Action: action, Endpoint: endpoint, Result: status });
    };

    afterAll((done) => {
        console.log("\n--- AUTOMATED INTENSE API EXECUTION REPORT ---");
        console.table(reportSummary);
        done();
    });

    // =========================================================================
    // 1. REGISTRATION & AUTH
    // =========================================================================
    describe('1. Registration & Authentication', () => {
        it('should register a new household and admin', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({
                    householdName,
                    email: adminEmail,
                    password: adminPassword,
                    firstName: 'Admin',
                    lastName: 'User'
                });
            
            expect(res.statusCode).toBe(201);
            logToReport('Register Household', '/auth/register', '✅ Success');
        });

        it('should login as the Household Admin', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: adminEmail,
                    password: adminPassword 
                });

            localAdminToken = res.body.token;
            householdId = res.body.tokenPayload?.householdId || res.body.household?.id;
            
            // If token payload isn't exposed directly, we might need to get it from profile or household list
            if (!householdId) {
                const profile = await request(app).get('/auth/profile').set('Authorization', `Bearer ${localAdminToken}`);
                householdId = profile.body.default_household_id;
            }

            expect(res.statusCode).toBe(200);
            expect(res.body.context).toBe('household');
            logToReport('Admin Login', '/auth/login', '✅ Success');
        });
    });

    // =========================================================================
    // 2. USER MANAGEMENT
    // =========================================================================
    describe('2. User Management', () => {
        it('should create a "Member" role user via Admin', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/users`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({
                    email: users.member.creds.email,
                    role: 'member',
                    firstName: 'Test',
                    lastName: 'Member',
                    password: users.member.creds.password
                });
            
            expect(res.statusCode).toBe(200);
            users.member.id = res.body.userId;
            logToReport('Create User (Member)', '/households/:id/users', '✅ Success');
        });

        it('should update the local user', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/users/${users.member.id}`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({
                    first_name: 'UpdatedName'
                });
            
            expect(res.statusCode).toBe(200);
            logToReport('Update User', '/households/:id/users/:id', '✅ Success');
        });

        it('should verify member can login', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: users.member.creds.email,
                    password: users.member.creds.password 
                });
            
            expect(res.statusCode).toBe(200);
            users.member.token = res.body.token;
            logToReport('Verify Member Login', '/auth/login', '✅ Success');
        });
    });

    // =========================================================================
    // 3. RESIDENT MANAGEMENT
    // =========================================================================
    describe('3. Resident Management', () => {
        it('should create an ADULT resident', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/members`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send(residents.adult.data);
            
            expect(res.statusCode).toBe(200);
            residents.adult.id = res.body.id;
            logToReport('Add Resident', `/households/${householdId}/members`, '✅ Success');
        });

        it('should verify a Birthday Event was auto-created', async () => {
            const res = await request(app)
                .get(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            
            const bday = res.body.find(e => e.member_id === residents.adult.id && e.type === 'birthday');
            expect(bday).toBeDefined();
            logToReport('Verify Birthday Sync', 'GET dates', '✅ Created');
        });
    });

    // =========================================================================
    // 4. EVENT MANAGEMENT
    // =========================================================================
    describe('4. Calendar & Events', () => {
        it('should create a standard event', async () => {
            const res = await request(app)
                .post(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ title: 'Family Dinner', date: '2025-12-25', emoji: '🍗' });
            
            expect(res.statusCode).toBe(200);
            eventId = res.body.id;
            logToReport('Create Event', `/households/${householdId}/dates`, `✅ ID: ${eventId}`);
        });

        it('should delete the event', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}/dates/${eventId}`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            
            expect(res.statusCode).toBe(200);
            logToReport('Delete Event', `/households/${householdId}/dates/${eventId}`, '✅ Success');
        });
    });

    // =========================================================================
    // 5. PHYSICAL ASSETS
    // =========================================================================
    describe('5. Physical Assets', () => {
        let vehicleId = null;

        it('should CRUD a Vehicle', async () => {
            const createRes = await request(app)
                .post(`/households/${householdId}/vehicles`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({
                    make: 'Tesla',
                    model: 'Model 3',
                    mot_due: '2026-06-01',
                    tax_due: '2026-01-01' 
                });
            expect(createRes.statusCode).toBe(200);
            vehicleId = createRes.body.id;

            const delRes = await request(app)
                .delete(`/households/${householdId}/vehicles/${vehicleId}`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            expect(delRes.statusCode).toBe(200);

            logToReport('CRUD Vehicle', `/households/${householdId}/vehicles`, '✅ Success');
        });
    });

    // =========================================================================
    // 6. HOUSEHOLD DELETION
    // =========================================================================
    describe('6. Household Deletion', () => {
        it('should delete the household as Admin', async () => {
            const res = await request(app)
                .delete(`/households/${householdId}`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            
            expect(res.statusCode).toBe(200);
            logToReport('Delete Household', `/households/${householdId}`, '✅ Success');
        });
    });
});
