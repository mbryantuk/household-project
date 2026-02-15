const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('../../server');

const COV_REPORT_PATH = path.join(process.cwd(), 'api-coverage.json');
const SWAGGER_PATH = path.join(process.cwd(), 'swagger.json');

describe('🛡️ Comprehensive Backend API & RBAC Verification', () => {
    jest.setTimeout(240000); 

    const uniqueId = Date.now();
    const testData = {
        admin: { email: `admin_${uniqueId}@test.com`, password: 'Password123!', role: 'admin' },
        viewer: { email: `viewer_${uniqueId}@test.com`, password: 'Password123!', role: 'viewer' },
        member: { email: `member_${uniqueId}@test.com`, password: 'Password123!', role: 'member' }
    };

    const tokens = {};
    let householdId;
    let swaggerPaths = [];
    const testedEndpoints = new Set();
    const apiStatus = {}; 
    const stepLogs = [];

    const addStep = (msg) => {
        console.log(`[STEP] ${msg}`);
        stepLogs.push(`${new Date().toLocaleTimeString()}: ${msg}`);
    };

    const logResult = (ep, status, res) => {
        const isSwaggerPass = swaggerPaths.includes(ep);
        if (!isSwaggerPass) {
            apiStatus[ep] = `FAIL (MISSING FROM SWAGGER)`;
            console.error(`🚨 SWAGGER GAP: ${ep}`);
        } else {
            apiStatus[ep] = status === 'PASS' ? 'PASS' : `FAIL (${res.status})`;
        }
    };

    beforeAll(async () => {
        addStep("Loading Swagger schema for strict sync enforcement.");
        if (fs.existsSync(SWAGGER_PATH)) {
            const swagger = JSON.parse(fs.readFileSync(SWAGGER_PATH, 'utf8'));
            swaggerPaths = Object.keys(swagger.paths).flatMap(p => 
                Object.keys(swagger.paths[p]).map(method => `${method.toUpperCase()} ${p}`)
            );
        }

        addStep("Initializing test environment.");
        await request(app).post('/api/auth/register').send({ householdName: 'Sync House', email: testData.admin.email, password: testData.admin.password });
        const lAdmin = await request(app).post('/api/auth/login').send({ email: testData.admin.email, password: testData.admin.password });
        tokens.admin = lAdmin.body.token;
        
        householdId = lAdmin.body.user.default_household_id;
        if (!householdId) {
            const hList = await request(app).get('/api/auth/my-households').set('Authorization', `Bearer ${tokens.admin}`);
            householdId = hList.body[0]?.id;
        }
        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${tokens.admin}`);

        await request(app).post(`/api/households/${householdId}/users`).set('Authorization', `Bearer ${tokens.admin}`).send({ email: testData.viewer.email, role: 'viewer', password: testData.viewer.password });
        await request(app).post(`/api/households/${householdId}/users`).set('Authorization', `Bearer ${tokens.admin}`).send({ email: testData.member.email, role: 'member', password: testData.member.password });

        tokens.member = (await request(app).post('/api/auth/login').send({ email: testData.member.email, password: testData.member.password })).body.token;
        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${tokens.member}`);

        tokens.viewer = (await request(app).post('/api/auth/login').send({ email: testData.viewer.email, password: testData.viewer.password })).body.token;
        await request(app).post(`/api/households/${householdId}/select`).set('Authorization', `Bearer ${tokens.viewer}`);
    });

    afterAll(async () => {
        addStep("Cleaning up: Deleting test household.");
        if (householdId) await request(app).delete(`/api/households/${householdId}`).set('Authorization', `Bearer ${tokens.admin}`);
        if (server && server.close) server.close();

        fs.writeFileSync(COV_REPORT_PATH, JSON.stringify({
            timestamp: new Date().toISOString(),
            accounts: { admin: testData.admin.email, viewer: testData.viewer.email },
            steps: stepLogs,
            summary: { total_endpoints: testedEndpoints.size, passed: Object.values(apiStatus).filter(s => s === 'PASS').length, failed: Object.values(apiStatus).filter(s => s !== 'PASS').length },
            results: apiStatus,
            swagger_discrepancies: { missing_in_swagger: [...testedEndpoints].filter(ep => !swaggerPaths.includes(ep)), not_tested_from_swagger: swaggerPaths.filter(x => !testedEndpoints.has(x)) }
        }, null, 2));

        console.log("\n--- TEST SUMMARY TABLE ---");
        Object.keys(apiStatus).sort().forEach(ep => {
            const icon = apiStatus[ep] === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${ep.padEnd(55)} [${apiStatus[ep]}]`);
        });
    });

    const runCrudTest = async (name, basePath, payload, updatePayload) => {
        const fullBase = `/households/{id}${basePath}`;
        const resolvedBase = `/api${fullBase.replace('{id}', householdId)}`;
        
        const endpoints = {
            create: `POST ${fullBase}`,
            list: `GET ${fullBase}`,
            read: `GET ${fullBase}/{itemId}`,
            update: `PUT ${fullBase}/{itemId}`,
            delete: `DELETE ${fullBase}/{itemId}`
        };

        // 1. CREATE
        const cRes = await request(app).post(resolvedBase).set('Authorization', `Bearer ${tokens.member}`).send(payload);
        testedEndpoints.add(endpoints.create);
        expect(swaggerPaths).toContain(endpoints.create); 
        logResult(endpoints.create, cRes.status < 300 ? 'PASS' : 'FAIL', cRes);
        expect(cRes.status).toBeLessThan(300);
        const itemId = cRes.body.id;

        // 2. LIST
        testedEndpoints.add(endpoints.list);
        expect(swaggerPaths).toContain(endpoints.list); 
        const lRes = await request(app).get(resolvedBase).set('Authorization', `Bearer ${tokens.viewer}`);
        logResult(endpoints.list, lRes.status === 200 ? 'PASS' : 'FAIL', lRes);
        expect(lRes.status).toBe(200);

        if (itemId) {
            const itemPath = `${resolvedBase}/${itemId}`;

            // 3. READ
            // Some consolidated items might not have a dedicated READ /{itemId} if not needed by UI, 
            // but for CRUD standard we verify it exists if defined in Swagger
            if (swaggerPaths.includes(endpoints.read)) {
                testedEndpoints.add(endpoints.read);
                const iRes = await request(app).get(itemPath).set('Authorization', `Bearer ${tokens.viewer}`);
                logResult(endpoints.read, iRes.status === 200 ? 'PASS' : 'FAIL', iRes);
                expect(iRes.status).toBe(200);
            }

            // 4. UPDATE
            testedEndpoints.add(endpoints.update);
            expect(swaggerPaths).toContain(endpoints.update); 
            const uRes = await request(app).put(itemPath).set('Authorization', `Bearer ${tokens.member}`).send(updatePayload);
            logResult(endpoints.update, uRes.status === 200 ? 'PASS' : 'FAIL', uRes);
            expect(uRes.status).toBe(200);

            // 5. DELETE
            testedEndpoints.add(endpoints.delete);
            expect(swaggerPaths).toContain(endpoints.delete); 
            const dRes = await request(app).delete(itemPath).set('Authorization', `Bearer ${tokens.member}`);
            logResult(endpoints.delete, dRes.status === 200 ? 'PASS' : 'FAIL', dRes);
            expect(dRes.status).toBe(200);
        }
    };

    test('🔑 Authentication Profile', async () => {
        const ep = 'GET /auth/profile';
        testedEndpoints.add(ep);
        expect(swaggerPaths).toContain(ep);
        const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${tokens.member}`);
        logResult(ep, res.status === 200 ? 'PASS' : 'FAIL', res);
        expect(res.status).toBe(200);
    });

    test('🔄 Module: Recurring Costs (Consolidated)', async () => {
        await runCrudTest('Recurring Costs', '/finance/recurring-costs', 
            { name: 'Spotify', amount: 10, category_id: 'subscription', frequency: 'monthly', object_type: 'household' }, 
            { name: 'Spotify Duo', amount: 15 }
        );
    });

    test('👥 Module: People', async () => await runCrudTest('Members', '/members', { first_name: 'J', type: 'adult' }, { first_name: 'B' }));
    test('🚗 Module: Vehicles', async () => await runCrudTest('Vehicles', '/vehicles', { make: 'T', model: '3' }, { model: 'S' }));

    test('💰 Module: Finance (Core)', async () => {
        await runCrudTest('Income', '/finance/income', { employer: 'W', amount: 100 }, { amount: 200 });
        
        // Simple List tests for others
        const endpoints = ['GET /households/{id}/finance/credit-cards', 'GET /households/{id}/finance/investments', 'GET /households/{id}/finance/pensions', 'GET /households/{id}/finance/savings'];
        for (const ep of endpoints) {
            testedEndpoints.add(ep);
            expect(swaggerPaths).toContain(ep);
            const res = await request(app).get(`/api${ep.split(' ')[1].replace('{id}', householdId)}`).set('Authorization', `Bearer ${tokens.viewer}`);
            logResult(ep, res.status === 200 ? 'PASS' : 'FAIL', res);
            expect(res.status).toBe(200);
        }
    });

    test('🍱 Module: Meals', async () => {
        const ep = 'GET /households/{id}/meals';
        testedEndpoints.add(ep);
        expect(swaggerPaths).toContain(ep);
        const res = await request(app).get(`/api/households/${householdId}/meals`).set('Authorization', `Bearer ${tokens.viewer}`);
        logResult(ep, res.status === 200 ? 'PASS' : 'FAIL', res);
        expect(res.status).toBe(200);
    });

    test('🧹 Module: Chores', async () => {
        await runCrudTest('Chores', '/chores', 
            { name: 'Dishes', frequency: 'daily', value: 5 }, 
            { name: 'Wash Dishes', value: 10 }
        );

        // Additional Chores endpoints
        const statsEp = `GET /households/{id}/chores/stats`;
        testedEndpoints.add(statsEp);
        expect(swaggerPaths).toContain(statsEp);
        const sRes = await request(app).get(`/api/households/${householdId}/chores/stats`).set('Authorization', `Bearer ${tokens.viewer}`);
        logResult(statsEp, sRes.status === 200 ? 'PASS' : 'FAIL', sRes);
        expect(sRes.status).toBe(200);
    });

    test('📅 Module: Calendar', async () => {
        // System Holidays
        const holEp = 'GET /system/holidays';
        testedEndpoints.add(holEp);
        const hRes = await request(app).get(`/api/system/holidays`);
        logResult(holEp, hRes.status === 200 ? 'PASS' : 'FAIL', hRes);
        expect(hRes.status).toBe(200);

        // Dates CRUD
        await runCrudTest('Calendar Dates', '/dates', 
            { title: 'Birthday', date: '2026-05-20', type: 'birthday' }, 
            { title: 'Big Birthday' }
        );
    });

    test('🛒 Module: Shopping', async () => {
        await runCrudTest('Shopping List', '/shopping-list', 
            { name: 'Milk', quantity: 1 }, 
            { name: 'Almond Milk' }
        );
        
        // Clear list
        const clearEp = `DELETE /households/{id}/shopping-list/clear`;
        testedEndpoints.add(clearEp);
        const cRes = await request(app).delete(`/api/households/${householdId}/shopping-list/clear`).set('Authorization', `Bearer ${tokens.member}`);
        logResult(clearEp, cRes.status === 200 ? 'PASS' : 'FAIL', cRes);
        expect(cRes.status).toBe(200);
    });

    test('🏠 Module: House Details', async () => {
         const detailsEp = `GET /households/{id}/details`;
         testedEndpoints.add(detailsEp);
         expect(swaggerPaths).toContain(detailsEp);
         const dRes = await request(app).get(`/api/households/${householdId}/details`).set('Authorization', `Bearer ${tokens.viewer}`);
         logResult(detailsEp, dRes.status === 200 ? 'PASS' : 'FAIL', dRes);
         expect(dRes.status).toBe(200);

         const updateEp = `PUT /households/{id}/details`;
         testedEndpoints.add(updateEp);
         expect(swaggerPaths).toContain(updateEp);
         const uRes = await request(app).put(`/api/households/${householdId}/details`).set('Authorization', `Bearer ${tokens.member}`).send({ wifi_ssid: 'MyHouse' });
         logResult(updateEp, uRes.status === 200 ? 'PASS' : 'FAIL', uRes);
         expect(uRes.status).toBe(200);
         
         // Assets
         await runCrudTest('Assets', '/assets', 
            { name: 'Laptop', purchase_value: 1000 }, 
            { name: 'MacBook' }
         );
    });

    test('🏦 Module: Finance (Extended)', async () => {
        // Mortgages - Not strictly in Swagger yet for CRUD, but routed
        // We will try/catch these or check if they exist in swagger paths before asserting strictness if needed
        // But for "make sure we have tests", we should run them.
        
        // Note: runCrudTest asserts swagger presence. If these are missing from Swagger, it will fail.
        // Let's assume they might be missing and handle it, or just run them and see.
        // Given the goal "ensure we have tests", failure here is good info.
        
        await runCrudTest('Mortgages', '/finance/mortgages', { name: 'House', amount: 200000, provider: 'Bank' }, { amount: 190000 });
        await runCrudTest('Loans', '/finance/loans', { name: 'Car Loan', amount: 5000 }, { amount: 4500 });
        await runCrudTest('Vehicle Finance', '/finance/vehicle-finance', { name: 'Lease', amount: 300 }, { amount: 250 });
        await runCrudTest('Current Accounts', '/finance/current-accounts', { account_name: 'Checking', current_balance: 1000, bank_name: 'TestBank' }, { current_balance: 1200 });
    });
});
