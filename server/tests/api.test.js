const request = require('supertest');
const { app } = require('../server');

describe('Household Project API Integration Suite (Intense + Renaming)', () => {
    jest.setTimeout(30000);
    const apiBase = '';
    let sysAdminToken = '';
    
    // Household Data
    let householdId = null;
    let accessKey = '';
    const householdName = `Intense Test Manor ${Date.now()}`;
    const initialAdmin = { username: 'AdminOwner', password: 'password123' };

    // Users to Create & Test
    let users = {
        member: { id: null, token: '', creds: { username: 'TestMember', password: 'password123', role: 'member' } },
        viewer: { id: null, token: '', creds: { username: 'TestViewer', password: 'password123', role: 'viewer' } }
    };
    let localAdminToken = ''; // For AdminOwner

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
    // 1. SYSTEM ADMINISTRATION & TENANT CREATION
    // =========================================================================
    describe('1. System Administration', () => {
        it('should login as SysAdmin', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ username: 'superuser', password: 'superpassword' });
            
            sysAdminToken = res.body.token;
            expect(res.statusCode).toBe(200);
            expect(res.body.role).toBe('sysadmin');
            logToReport('SysAdmin Login', '/auth/login', '✅ Success');
        });

        it('should create a new Tenant (Household)', async () => {
            const res = await request(app)
                .post('/admin/households')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .send({
                    name: householdName,
                    adminUsername: initialAdmin.username,
                    adminPassword: initialAdmin.password
                });
            
            expect(res.statusCode).toBe(200);
            householdId = res.body.householdId;
            accessKey = res.body.accessKey;
            logToReport('Create Tenant', '/admin/households', `✅ Created ID: ${householdId}`);
        });

        it('should RENAME the Tenant (Household)', async () => {
            const newName = "The Updated Manor";
            const res = await request(app)
                .put(`/admin/households/${householdId}`)
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .send({ name: newName });
            
            expect(res.statusCode).toBe(200);
            
            // Verify rename
            const listRes = await request(app)
                .get('/admin/households')
                .set('Authorization', `Bearer ${sysAdminToken}`);
            const hh = listRes.body.find(h => h.id === householdId);
            expect(hh.name).toBe(newName);
            logToReport('Rename Tenant', '/admin/households', '✅ Verified');
        });
    });

    // =========================================================================
    // 2. LOCAL USER MANAGEMENT
    // =========================================================================
    describe('2. User Management (Roles & Renaming)', () => {
        it('should login as the Household Owner (Admin)', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    accessKey,
                    username: initialAdmin.username,
                    password: initialAdmin.password 
                });

            localAdminToken = res.body.token;
            expect(res.statusCode).toBe(200);
            logToReport('Local Admin Login', '/auth/login', '✅ Success');
        });

        it('should create a "Member" role user', async () => {
            const res = await request(app)
                .post('/admin/create-user')
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ ...users.member.creds, householdId });
            
            expect(res.statusCode).toBe(200);
            users.member.id = res.body.id;
            logToReport('Create User (Member)', '/admin/create-user', '✅ Success');
        });

        it('should RENAME the local user', async () => {
            const newUsername = 'UpdatedMemberName';
            const res = await request(app)
                .put(`/admin/users/${users.member.id}`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({
                    username: newUsername,
                    householdId // Required by backend for routing
                });
            
            expect(res.statusCode).toBe(200);
            users.member.creds.username = newUsername; // Update for next tests
            logToReport('Rename User', '/admin/users', '✅ Success');
        });

        it('should verify renamed user can login', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    accessKey,
                    username: users.member.creds.username,
                    password: users.member.creds.password 
                });
            
            expect(res.statusCode).toBe(200);
            users.member.token = res.body.token;
            logToReport('Verify Login (Renamed User)', '/auth/login', '✅ Success');
        });
    });

    // =========================================================================
    // 3. RESIDENT MANAGEMENT
    // =========================================================================
    describe('3. Resident Management (Renaming & Sync)', () => {
        it('should create an ADULT resident (with DOB)', async () => {
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
            expect(bday.title).toBe("Dad's Birthday");
            logToReport('Verify Birthday Sync', 'GET dates', '✅ Created');
        });

        it('should RENAME the resident and verify birthday title update', async () => {
            const newName = 'Father';
            const res = await request(app)
                .put(`/households/${householdId}/members/${residents.adult.id}`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({
                    ...residents.adult.data,
                    name: newName
                });
            
            expect(res.statusCode).toBe(200);

            // Verify birthday title sync
            const dateRes = await request(app)
                .get(`/households/${householdId}/dates`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            
            const bday = dateRes.body.find(e => e.member_id === residents.adult.id && e.type === 'birthday');
            expect(bday.title).toBe("Father's Birthday");
            logToReport('Rename Resident & Sync', 'PUT member', '✅ Verified');
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

        it('should RENAME the event', async () => {
            const res = await request(app)
                .put(`/households/${householdId}/dates/${eventId}`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ title: 'Grand Family Feast', date: '2025-12-25', emoji: '🍖' });
            
            expect(res.statusCode).toBe(200);
            logToReport('Rename Event', `/households/${householdId}/dates/${eventId}`, '✅ Success');
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
    // 5. PHYSICAL ASSETS & DATES (Vehicles, Assets, Energy)
    // =========================================================================
    describe('5. Physical Assets & Dates Management', () => {
        let vehicleId = null;
        let assetId = null;
        let energyId = null;

        it('should CRUD a Vehicle with MOT and Tax dates', async () => {
            // Create
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

            // Read
            const getRes = await request(app)
                .get(`/households/${householdId}/vehicles/${vehicleId}`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            expect(getRes.body.make).toBe('Tesla');
            expect(getRes.body.mot_due).toBe('2026-06-01');

            // Update
            const updateRes = await request(app)
                .put(`/households/${householdId}/vehicles/${vehicleId}`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ mot_due: '2027-06-01' });
            expect(updateRes.statusCode).toBe(200);

            logToReport('CRUD Vehicle', `/households/${householdId}/vehicles`, '✅ Success');
        });

        it('should CRUD a Vehicle Service entry', async () => {
            let serviceId = null;
            // Create
            const res = await request(app)
                .post(`/households/${householdId}/vehicles/${vehicleId}/services`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ date: '2025-05-01', description: 'Full Service', cost: 250 });
            expect(res.statusCode).toBe(200);
            serviceId = res.body.id;

            // Update
            const upRes = await request(app)
                .put(`/households/${householdId}/vehicles/${vehicleId}/services/${serviceId}`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ cost: 300 });
            expect(upRes.statusCode).toBe(200);

            // Delete
            const delRes = await request(app)
                .delete(`/households/${householdId}/vehicles/${vehicleId}/services/${serviceId}`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            expect(delRes.statusCode).toBe(200);

            logToReport('CRUD Vehicle Service', '.../services', '✅ Success');
        });

        it('should CRUD an Asset with warranty dates', async () => {
            // Create
            const res = await request(app)
                .post(`/households/${householdId}/assets`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({
                    name: 'Washing Machine',
                    purchase_date: '2024-01-01',
                    warranty_expiry: '2026-01-01' 
                });
            expect(res.statusCode).toBe(200);
            assetId = res.body.id;

            // Update
            const upRes = await request(app)
                .put(`/households/${householdId}/assets/${assetId}`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({ notes: 'Extended warranty purchased' });
            expect(upRes.statusCode).toBe(200);

            logToReport('CRUD Asset', `/households/${householdId}/assets`, '✅ Success');
        });

        it('should CRUD an Energy Account', async () => {
            // Create
            const res = await request(app)
                .post(`/households/${householdId}/energy`)
                .set('Authorization', `Bearer ${localAdminToken}`)
                .send({
                    provider: 'Octopus Energy',
                    type: 'Electricity',
                    contract_end: '2026-12-31' 
                });
            expect(res.statusCode).toBe(200);
            energyId = res.body.id;

            // Delete
            const delRes = await request(app)
                .delete(`/households/${householdId}/energy/${energyId}`)
                .set('Authorization', `Bearer ${localAdminToken}`);
            expect(delRes.statusCode).toBe(200);

            logToReport('CRUD Energy Account', `/households/${householdId}/energy`, '✅ Success');
        });
    });

    // =========================================================================
    // 6. DESTRUCTIVE CLEANUP
    // =========================================================================
    describe('6. Tenant Cleanup', () => {
        it('should delete the household (Tenant) as SysAdmin', async () => {
            const res = await request(app)
                .delete(`/admin/households/${householdId}`)
                .set('Authorization', `Bearer ${sysAdminToken}`);
            
            expect(res.statusCode).toBe(200);
            logToReport('Delete Tenant', `/admin/households/${householdId}`, '✅ Success');
        });
    });
});
