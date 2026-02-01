const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('../../server');

const SECRET_KEY = 'super_secret_pi_key';
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
        expect(swaggerPaths).toContain(endpoints.create); // STRICT SWAGGER SYNC
        logResult(endpoints.create, cRes.status < 300 ? 'PASS' : 'FAIL', cRes);
        expect(cRes.status).toBeLessThan(300);
        const itemId = cRes.body.id;

        // 2. LIST
        testedEndpoints.add(endpoints.list);
        expect(swaggerPaths).toContain(endpoints.list); // STRICT SWAGGER SYNC
        const lRes = await request(app).get(resolvedBase).set('Authorization', `Bearer ${tokens.viewer}`);
        logResult(endpoints.list, lRes.status === 200 ? 'PASS' : 'FAIL', lRes);
        expect(lRes.status).toBe(200);

        if (itemId) {
            const itemPath = `${resolvedBase}/${itemId}`;

            // 3. READ
            testedEndpoints.add(endpoints.read);
            expect(swaggerPaths).toContain(endpoints.read); // STRICT SWAGGER SYNC
            const iRes = await request(app).get(itemPath).set('Authorization', `Bearer ${tokens.viewer}`);
            logResult(endpoints.read, iRes.status === 200 ? 'PASS' : 'FAIL', iRes);
            expect(iRes.status).toBe(200);

            // 4. UPDATE
            testedEndpoints.add(endpoints.update);
            expect(swaggerPaths).toContain(endpoints.update); // STRICT SWAGGER SYNC
            const uRes = await request(app).put(itemPath).set('Authorization', `Bearer ${tokens.member}`).send(updatePayload);
            logResult(endpoints.update, uRes.status === 200 ? 'PASS' : 'FAIL', uRes);
            expect(uRes.status).toBe(200);

            // 5. DELETE
            testedEndpoints.add(endpoints.delete);
            expect(swaggerPaths).toContain(endpoints.delete); // STRICT SWAGGER SYNC
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

    test('🏠 Module: Utilities', async () => {
        await runCrudTest('Water', '/water', { provider: 'T' }, { provider: 'S' });
        await runCrudTest('Energy', '/energy', { provider: 'O' }, { provider: 'E' });
        await runCrudTest('Council', '/council', { authority_name: 'L' }, { authority_name: 'K' });
        await runCrudTest('Waste', '/waste', { bin_type: 'M' }, { bin_type: 'T' });
    });

    test('👥 Module: People', async () => await runCrudTest('Members', '/members', { first_name: 'J', type: 'adult' }, { first_name: 'B' }));
    test('📦 Module: Assets', async () => await runCrudTest('Assets', '/assets', { name: 'T' }, { name: 'O' }));
    test('🚗 Module: Vehicles', async () => await runCrudTest('Vehicles', '/vehicles', { make: 'T', model: '3' }, { model: 'S' }));

    test('💰 Module: Finance', async () => {
        await runCrudTest('Income', '/finance/income', { employer: 'W', amount: 100 }, { amount: 200 });
        await runCrudTest('Savings', '/finance/savings', { institution: 'B', account_name: 'S' }, { account_name: 'H' });
        await runCrudTest('Credit Cards', '/finance/credit-cards', { provider: 'A', card_name: 'C' }, { card_name: 'V' });
        await runCrudTest('Loans', '/finance/loans', { lender: 'B', loan_type: 'P' }, { loan_type: 'A' });
        await runCrudTest('Mortgages', '/finance/mortgages', { lender: 'N', property_address: 'M' }, { property_address: 'H' });
        await runCrudTest('Agreements', '/finance/agreements', { provider: 'P', agreement_name: 'M' }, { agreement_name: 'L' });
        await runCrudTest('Investments', '/finance/investments', { name: 'V', symbol: 'V' }, { name: 'H' });
        await runCrudTest('Pensions', '/finance/pensions', { provider: 'A', plan_name: 'P' }, { plan_name: 'S' });
    });

    test('🍱 Module: Meals', async () => await runCrudTest('Meals', '/meals', { name: 'P' }, { name: 'S' }));

    test('⚡ Module: Admin', async () => {
        const adminEndpoints = ['GET /admin/test-results', 'GET /admin/version-history'];
        for (const ep of adminEndpoints) {
            testedEndpoints.add(ep);
            expect(swaggerPaths).toContain(ep);
            const res = await request(app).get(`/api${ep.split(' ')[1]}?id=${householdId}`).set('Authorization', `Bearer ${tokens.admin}`);
            logResult(ep, res.status === 200 ? 'PASS' : 'FAIL', res);
            expect(res.status).toBe(200);
        }
    });
});