const request = require('supertest');
const { app } = require('../server');

describe('Comprehensive CRUD & Multi-Tenancy Suite', () => {
    jest.setTimeout(30000);

    const uniqueId = Date.now();
    let sysAdminToken = '';
    let hh1 = { id: null, token: '', adminEmail: `hh1_${uniqueId}@example.com`, password: 'password123' };
    let hh2 = { id: null, token: '', adminEmail: `hh2_${uniqueId}@example.com`, password: 'password123' };

    beforeAll(async () => {
        // 1. Login as SysAdmin
        const loginRes = await request(app)
            .post('/auth/login')
            .send({ username: 'superuser', password: 'superpassword' });
        sysAdminToken = loginRes.body.token;

        // 2. Create Household 1
        const hh1Res = await request(app)
            .post('/admin/households')
            .set('Authorization', `Bearer ${sysAdminToken}`)
            .send({
                name: `HH1_${uniqueId}`,
                adminEmail: hh1.adminEmail,
                adminPassword: hh1.password,
                adminUsername: 'HH1Admin'
            });
        hh1.id = hh1Res.body.householdId;

        // 3. Create Household 2
        const hh2Res = await request(app)
            .post('/admin/households')
            .set('Authorization', `Bearer ${sysAdminToken}`)
            .send({
                name: `HH2_${uniqueId}`,
                adminEmail: hh2.adminEmail,
                adminPassword: hh2.password,
                adminUsername: 'HH2Admin'
            });
        hh2.id = hh2Res.body.householdId;

        // 4. Login as HH1 Admin
        const hh1Login = await request(app)
            .post('/auth/login')
            .send({ email: hh1.adminEmail, password: hh1.password });
        hh1.token = hh1Login.body.token;

        // 5. Login as HH2 Admin
        const hh2Login = await request(app)
            .post('/auth/login')
            .send({ email: hh2.adminEmail, password: hh2.password });
        hh2.token = hh2Login.body.token;
    });

    afterAll(async () => {
        if (hh1.id) await request(app).delete(`/admin/households/${hh1.id}`).set('Authorization', `Bearer ${sysAdminToken}`);
        if (hh2.id) await request(app).delete(`/admin/households/${hh2.id}`).set('Authorization', `Bearer ${sysAdminToken}`);
    });

    const testCrud = (name, endpoint, createData, updateData) => {
        describe(`${name} CRUD`, () => {
            let itemId;

            it(`should create ${name} in HH1`, async () => {
                const res = await request(app)
                    .post(`/households/${hh1.id}${endpoint}`)
                    .set('Authorization', `Bearer ${hh1.token}`)
                    .send(createData);
                expect(res.statusCode).toBe(200);
                itemId = res.body.id;
                expect(itemId).toBeDefined();
            });

            it(`should read ${name} in HH1`, async () => {
                const res = await request(app)
                    .get(`/households/${hh1.id}${endpoint}/${itemId}`)
                    .set('Authorization', `Bearer ${hh1.token}`);
                expect(res.statusCode).toBe(200);
                const firstField = Object.keys(createData)[0];
                expect(res.body[firstField]).toBe(createData[firstField]);
            });

            it(`should update ${name} in HH1`, async () => {
                const res = await request(app)
                    .put(`/households/${hh1.id}${endpoint}/${itemId}`)
                    .set('Authorization', `Bearer ${hh1.token}`)
                    .send(updateData);
                expect(res.statusCode).toBe(200);
            });

            it(`should block HH2 from reading HH1's ${name}`, async () => {
                const res = await request(app)
                    .get(`/households/${hh1.id}${endpoint}/${itemId}`)
                    .set('Authorization', `Bearer ${hh2.token}`);
                expect(res.statusCode).toBe(403);
            });

            it(`should delete ${name} in HH1`, async () => {
                const res = await request(app)
                    .delete(`/households/${hh1.id}${endpoint}/${itemId}`)
                    .set('Authorization', `Bearer ${hh1.token}`);
                expect(res.statusCode).toBe(200);
            });
        });
    };

    const testSingletonCrud = (name, endpoint, initialData, updateData) => {
        describe(`${name} Singleton CRUD`, () => {
            it(`should update ${name} in HH1`, async () => {
                const res = await request(app)
                    .put(`/households/${hh1.id}${endpoint}`)
                    .set('Authorization', `Bearer ${hh1.token}`)
                    .send(updateData);
                expect(res.statusCode).toBe(200);
            });

            it(`should read ${name} in HH1 and verify data`, async () => {
                const res = await request(app)
                    .get(`/households/${hh1.id}${endpoint}`)
                    .set('Authorization', `Bearer ${hh1.token}`);
                expect(res.statusCode).toBe(200);
                const firstField = Object.keys(updateData)[0];
                expect(res.body[firstField]).toBe(updateData[firstField]);
            });

            it(`should ensure HH2 has empty/different ${name}`, async () => {
                const res = await request(app)
                    .get(`/households/${hh2.id}${endpoint}`)
                    .set('Authorization', `Bearer ${hh2.token}`);
                expect(res.statusCode).toBe(200);
                const firstField = Object.keys(updateData)[0];
                if (res.body[firstField]) {
                    expect(res.body[firstField]).not.toBe(updateData[firstField]);
                }
            });
        });
    };

    // 1. Singleton Objects
    testSingletonCrud('House Details', '/details', { property_type: 'Detached' }, { property_type: 'Semi-Detached', notes: 'Updated notes' });
    testSingletonCrud('Water Info', '/water', { provider: 'Thames Water' }, { provider: 'Anglian Water', account_number: 'W12345' });
    testSingletonCrud('Council Info', '/council', { authority_name: 'London' }, { authority_name: 'Manchester', monthly_amount: 150 });

    // 2. Collection Objects
    testCrud('Waste Collection', '/waste', 
        { waste_type: 'Recycling', frequency: 'Weekly', collection_day: 'Monday' },
        { collection_day: 'Tuesday' }
    );
    testCrud('Recurring Cost', '/costs',
        { name: 'Netflix', amount: 10.99, parent_type: 'general', category: 'entertainment' },
        { amount: 15.99 }
    );
    testCrud('Asset', '/assets',
        { name: 'Laptop', category: 'Electronics', purchase_value: 1200 },
        { purchase_value: 1100 }
    );
    testCrud('Vehicle', '/vehicles',
        { make: 'Toyota', model: 'Corolla', mot_due: '2025-01-01' },
        { model: 'Yaris' }
    );
    testCrud('Member', '/members',
        { name: 'John Doe', type: 'adult', dob: '1990-01-01' },
        { name: 'John Smith' }
    );
    testCrud('Date (Calendar)', '/dates',
        { title: 'Party', date: '2025-05-05', type: 'event' },
        { title: 'Big Party' }
    );

    // 3. Vehicle Sub-modules
    describe('Vehicle Sub-modules CRUD', () => {
        let vehicleId;
        let serviceId;

        beforeAll(async () => {
            const res = await request(app)
                .post(`/households/${hh1.id}/vehicles`)
                .set('Authorization', `Bearer ${hh1.token}`)
                .send({ make: 'SubTest', model: 'Test' });
            vehicleId = res.body.id;
        });

        it('should CRUD Vehicle Services', async () => {
            const create = await request(app)
                .post(`/households/${hh1.id}/vehicles/${vehicleId}/services`)
                .set('Authorization', `Bearer ${hh1.token}`)
                .send({ date: '2025-01-01', description: 'Oil Change', cost: 50 });
            expect(create.statusCode).toBe(200);
            serviceId = create.body.id;

            const update = await request(app)
                .put(`/households/${hh1.id}/vehicles/${vehicleId}/services/${serviceId}`)
                .set('Authorization', `Bearer ${hh1.token}`)
                .send({ cost: 60 });
            expect(update.statusCode).toBe(200);

            const del = await request(app)
                .delete(`/households/${hh1.id}/vehicles/${vehicleId}/services/${serviceId}`)
                .set('Authorization', `Bearer ${hh1.token}`);
            expect(del.statusCode).toBe(200);
        });

        it('should CRUD Vehicle Finance', async () => {
            const create = await request(app)
                .post(`/households/${hh1.id}/vehicles/${vehicleId}/finance`)
                .set('Authorization', `Bearer ${hh1.token}`)
                .send({ provider: 'Bank', monthly_payment: 200 });
            const id = create.body.id;
            expect(create.statusCode).toBe(200);

            const del = await request(app)
                .delete(`/households/${hh1.id}/vehicles/${vehicleId}/finance/${id}`)
                .set('Authorization', `Bearer ${hh1.token}`);
            expect(del.statusCode).toBe(200);
        });

        it('should CRUD Vehicle Insurance', async () => {
            const create = await request(app)
                .post(`/households/${hh1.id}/vehicles/${vehicleId}/insurance`)
                .set('Authorization', `Bearer ${hh1.token}`)
                .send({ provider: 'Aviva', premium: 400 });
            const id = create.body.id;
            expect(create.statusCode).toBe(200);

            const del = await request(app)
                .delete(`/households/${hh1.id}/vehicles/${vehicleId}/insurance/${id}`)
                .set('Authorization', `Bearer ${hh1.token}`);
            expect(del.statusCode).toBe(200);
        });
    });

    // 4. Energy Accounts
    testCrud('Energy Account', '/energy',
        { provider: 'E.ON', type: 'Gas' },
        { type: 'Dual Fuel' }
    );
});