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
    member: { email: `member_${uniqueId}@test.com`, password: 'Password123!', role: 'member' },
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
    addStep('Loading Swagger schema for strict sync enforcement.');
    if (fs.existsSync(SWAGGER_PATH)) {
      const swagger = JSON.parse(fs.readFileSync(SWAGGER_PATH, 'utf8'));
      swaggerPaths = Object.keys(swagger.paths).flatMap((p) =>
        Object.keys(swagger.paths[p]).map((method) => `${method.toUpperCase()} ${p}`)
      );
    }

    addStep('Initializing test environment.');
    await request(app).post('/api/auth/register').send({
      householdName: 'Sync House',
      email: testData.admin.email,
      password: testData.admin.password,
    });
    const lAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: testData.admin.email, password: testData.admin.password });
    tokens.admin = lAdmin.body.token;

    householdId = lAdmin.body.user.default_household_id;
    if (!householdId) {
      const hList = await request(app)
        .get('/api/auth/my-households')
        .set('Authorization', `Bearer ${tokens.admin}`);
      householdId = hList.body[0]?.id;
    }
    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${tokens.admin}`);

    await request(app)
      .post(`/api/households/${householdId}/users`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ email: testData.viewer.email, role: 'viewer', password: testData.viewer.password });
    await request(app)
      .post(`/api/households/${householdId}/users`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ email: testData.member.email, role: 'member', password: testData.member.password });

    tokens.member = (
      await request(app)
        .post('/api/auth/login')
        .send({ email: testData.member.email, password: testData.member.password })
    ).body.token;
    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${tokens.member}`);

    tokens.viewer = (
      await request(app)
        .post('/api/auth/login')
        .send({ email: testData.viewer.email, password: testData.viewer.password })
    ).body.token;
    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
  });

  afterAll(async () => {
    addStep('Cleaning up: Deleting test household.');
    if (householdId)
      await request(app)
        .delete(`/api/households/${householdId}`)
        .set('Authorization', `Bearer ${tokens.admin}`);
    if (server && server.close) server.close();

    // Calculate Coverage
    const totalEndpoints = testedEndpoints.size;
    const passedEndpoints = Object.values(apiStatus).filter((s) => s === 'PASS').length;
    const failedEndpoints = Object.values(apiStatus).filter((s) => s !== 'PASS').length;

    // Calculate Swagger Percentage
    // Definition: (Tested & InSwagger) / TotalSwaggerEndpoints * 100
    const testedAndInSwagger = [...testedEndpoints].filter((ep) =>
      swaggerPaths.includes(ep)
    ).length;
    const totalSwagger = swaggerPaths.length;
    const swaggerCoveragePct =
      totalSwagger > 0 ? ((testedAndInSwagger / totalSwagger) * 100).toFixed(1) : '0.0';

    fs.writeFileSync(
      COV_REPORT_PATH,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          accounts: { admin: testData.admin.email, viewer: testData.viewer.email },
          steps: stepLogs,
          summary: {
            total_endpoints: totalEndpoints,
            passed: passedEndpoints,
            failed: failedEndpoints,
            swagger_coverage_pct: swaggerCoveragePct,
          },
          results: apiStatus,
          swagger_discrepancies: {
            missing_in_swagger: [...testedEndpoints].filter((ep) => !swaggerPaths.includes(ep)),
            not_tested_from_swagger: swaggerPaths.filter((x) => !testedEndpoints.has(x)),
          },
        },
        null,
        2
      )
    );

    console.log('\n--- TEST SUMMARY TABLE ---');
    Object.keys(apiStatus)
      .sort()
      .forEach((ep) => {
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
      delete: `DELETE ${fullBase}/{itemId}`,
    };

    // 1. CREATE
    const cRes = await request(app)
      .post(resolvedBase)
      .set('Authorization', `Bearer ${tokens.member}`)
      .send(payload);
    testedEndpoints.add(endpoints.create);
    // Note: We don't fail if NOT in swagger, we just mark as GAP later, but we expect it to be there for coverage
    logResult(endpoints.create, cRes.status < 300 ? 'PASS' : 'FAIL', cRes);
    expect(cRes.status).toBeLessThan(300);
    const itemId = cRes.body.id;

    // 2. LIST
    testedEndpoints.add(endpoints.list);
    const lRes = await request(app)
      .get(resolvedBase)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    logResult(endpoints.list, lRes.status === 200 ? 'PASS' : 'FAIL', lRes);
    expect(lRes.status).toBe(200);

    if (itemId) {
      const itemPath = `${resolvedBase}/${itemId}`;

      // 3. READ
      // Some consolidated items might not have a dedicated READ /{itemId} if not needed by UI,
      // but for CRUD standard we verify it exists if defined in Swagger
      if (swaggerPaths.includes(endpoints.read)) {
        testedEndpoints.add(endpoints.read);
        const iRes = await request(app)
          .get(itemPath)
          .set('Authorization', `Bearer ${tokens.viewer}`);
        logResult(endpoints.read, iRes.status === 200 ? 'PASS' : 'FAIL', iRes);
        expect(iRes.status).toBe(200);
      }

      // 4. UPDATE
      testedEndpoints.add(endpoints.update);
      const uRes = await request(app)
        .put(itemPath)
        .set('Authorization', `Bearer ${tokens.member}`)
        .send(updatePayload);
      logResult(endpoints.update, uRes.status === 200 ? 'PASS' : 'FAIL', uRes);
      expect(uRes.status).toBe(200);

      // 5. DELETE
      testedEndpoints.add(endpoints.delete);
      const dRes = await request(app)
        .delete(itemPath)
        .set('Authorization', `Bearer ${tokens.member}`);
      logResult(endpoints.delete, dRes.status === 200 ? 'PASS' : 'FAIL', dRes);
      expect(dRes.status).toBe(200);
    }
  };

  test('🔑 Authentication & Setup', async () => {
    // 1. Register (Already covered in beforeAll, but we explicitly test/record it here for coverage)
    const regEp = 'POST /auth/register';
    testedEndpoints.add(regEp);
    // We accept that it was successful in beforeAll, or we can do a quick fail-check
    // To be thorough and hit the endpoint:
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        householdName: 'Coverage House',
        email: `coverage_${uniqueId}@test.com`,
        password: 'Password123!',
      });
    logResult(regEp, regRes.status === 201 ? 'PASS' : 'FAIL', regRes);
    expect(regRes.status).toBe(201);

    // 2. Login
    const loginEp = 'POST /auth/login';
    testedEndpoints.add(loginEp);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: `coverage_${uniqueId}@test.com`,
        password: 'Password123!',
      });
    logResult(loginEp, loginRes.status === 200 ? 'PASS' : 'FAIL', loginRes);
    expect(loginRes.status).toBe(200);
    const covToken = loginRes.body.token;

    // 3. Profile (Get)
    const profileEp = 'GET /auth/profile';
    testedEndpoints.add(profileEp);
    const pRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokens.member}`);
    logResult(profileEp, pRes.status === 200 ? 'PASS' : 'FAIL', pRes);
    expect(pRes.status).toBe(200);

    // 4. Profile (Update) - MISSING
    const putProfileEp = 'PUT /auth/profile';
    testedEndpoints.add(putProfileEp);
    const upRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${tokens.member}`)
      .send({ firstName: 'UpdatedName' });
    logResult(putProfileEp, upRes.status === 200 ? 'PASS' : 'FAIL', upRes);
    expect(upRes.status).toBe(200);
  });

  test('🏠 Household Management', async () => {
    // 1. POST /households (Create new household)
    const createHouseEp = 'POST /households';
    testedEndpoints.add(createHouseEp);
    const cRes = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Secondary House' });
    logResult(createHouseEp, cRes.status === 201 ? 'PASS' : 'FAIL', cRes);
    expect(cRes.status).toBe(201);
    const newHouseId = cRes.body.id;

    // Cleanup extra household immediately
    await request(app)
      .delete(`/api/households/${newHouseId}`)
      .set('Authorization', `Bearer ${tokens.admin}`);

    // 2. GET /households/{id} (Use existing household context to avoid token issues)
    const getHouseEp = 'GET /households/{id}';
    testedEndpoints.add(getHouseEp);
    const gRes = await request(app)
      .get(`/api/households/${householdId}`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    logResult(getHouseEp, gRes.status === 200 ? 'PASS' : 'FAIL', gRes);
    expect(gRes.status).toBe(200);

    // 3. PUT /households/{id} (Use existing household context)
    const putHouseEp = 'PUT /households/{id}';
    testedEndpoints.add(putHouseEp);
    const uRes = await request(app)
      .put(`/api/households/${householdId}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Renamed Main House' });
    logResult(putHouseEp, uRes.status === 200 ? 'PASS' : 'FAIL', uRes);
    expect(uRes.status).toBe(200);
  });

  test('🔄 Module: Recurring Costs (Consolidated)', async () => {
    await runCrudTest(
      'Recurring Costs',
      '/finance/recurring-costs',
      {
        name: 'Spotify',
        amount: 10,
        category_id: 'subscription',
        frequency: 'monthly',
        object_type: 'household',
      },
      { name: 'Spotify Duo', amount: 15 }
    );
  });

  test('👥 Module: People', async () =>
    await runCrudTest(
      'Members',
      '/members',
      { first_name: 'J', type: 'adult' },
      { first_name: 'B' }
    ));
  test('🚗 Module: Vehicles', async () =>
    await runCrudTest('Vehicles', '/vehicles', { make: 'T', model: '3' }, { model: 'S' }));

  test('💰 Module: Finance (Core)', async () => {
    await runCrudTest('Income', '/finance/income', { employer: 'W', amount: 100 }, { amount: 200 });

    // Expanded CRUD coverage for Finance
    await runCrudTest(
      'Credit Cards',
      '/finance/credit-cards',
      { card_name: 'Visa', current_balance: 500, credit_limit: 5000, provider: 'Chase' },
      { current_balance: 400 }
    );
    await runCrudTest(
      'Investments',
      '/finance/investments',
      { name: 'Stocks', current_value: 1000, symbol: 'AAPL', platform: 'Fidelity' },
      { current_value: 1100 }
    );
    await runCrudTest(
      'Pensions',
      '/finance/pensions',
      { plan_name: 'Nest', current_value: 5000, provider: 'Nest' },
      { current_value: 5500 }
    );
    await runCrudTest(
      'Savings',
      '/finance/savings',
      { account_name: 'Rainy Day', current_balance: 2000, institution: 'Monzo' },
      { current_balance: 2100 }
    );
  });

  test('🍱 Module: Meals', async () => {
    const ep = 'GET /households/{id}/meals';
    testedEndpoints.add(ep);
    const res = await request(app)
      .get(`/api/households/${householdId}/meals`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    logResult(ep, res.status === 200 ? 'PASS' : 'FAIL', res);
    expect(res.status).toBe(200);

    // Add POST /meals
    const postMealEp = 'POST /households/{id}/meals';
    testedEndpoints.add(postMealEp);
    const mRes = await request(app)
      .post(`/api/households/${householdId}/meals`)
      .set('Authorization', `Bearer ${tokens.member}`)
      .send({ name: 'Pasta', day: 'Monday', meal_type: 'Dinner' });
    logResult(postMealEp, mRes.status === 201 ? 'PASS' : 'FAIL', mRes);
    expect(mRes.status).toBe(201);
  });

  test('🧹 Module: Chores', async () => {
    await runCrudTest(
      'Chores',
      '/chores',
      { name: 'Dishes', frequency: 'daily', value: 5 },
      { name: 'Wash Dishes', value: 10 }
    );

    // Create a chore for completion
    const cRes = await request(app)
      .post(`/api/households/${householdId}/chores`)
      .set('Authorization', `Bearer ${tokens.member}`)
      .send({ name: 'Trash', frequency: 'weekly', value: 10 });
    const choreId = cRes.body.id;

    // Completion
    const compEp = 'POST /households/{id}/chores/{itemId}/complete';
    testedEndpoints.add(compEp);
    const compRes = await request(app)
      .post(`/api/households/${householdId}/chores/${choreId}/complete`)
      .set('Authorization', `Bearer ${tokens.member}`);
    logResult(compEp, compRes.status === 200 ? 'PASS' : 'FAIL', compRes);
    expect(compRes.status).toBe(200);

    // Additional Chores endpoints
    const statsEp = `GET /households/{id}/chores/stats`;
    testedEndpoints.add(statsEp);
    const sRes = await request(app)
      .get(`/api/households/${householdId}/chores/stats`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
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
    await runCrudTest(
      'Calendar Dates',
      '/dates',
      { title: 'Birthday', date: '2026-05-20', type: 'birthday' },
      { title: 'Big Birthday' }
    );
  });

  test('🛒 Module: Shopping', async () => {
    await runCrudTest(
      'Shopping List',
      '/shopping-list',
      { name: 'Milk', quantity: 1 },
      { name: 'Almond Milk' }
    );

    // Clear list
    const clearEp = `DELETE /households/{id}/shopping-list/clear`;
    testedEndpoints.add(clearEp);
    const cRes = await request(app)
      .delete(`/api/households/${householdId}/shopping-list/clear`)
      .set('Authorization', `Bearer ${tokens.member}`);
    logResult(clearEp, cRes.status === 200 ? 'PASS' : 'FAIL', cRes);
    expect(cRes.status).toBe(200);
  });

  test('🏠 Module: House Details', async () => {
    const detailsEp = `GET /households/{id}/details`;
    testedEndpoints.add(detailsEp);
    const dRes = await request(app)
      .get(`/api/households/${householdId}/details`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    logResult(detailsEp, dRes.status === 200 ? 'PASS' : 'FAIL', dRes);
    expect(dRes.status).toBe(200);

    const updateEp = `PUT /households/{id}/details`;
    testedEndpoints.add(updateEp);
    const uRes = await request(app)
      .put(`/api/households/${householdId}/details`)
      .set('Authorization', `Bearer ${tokens.member}`)
      .send({ wifi_ssid: 'MyHouse' });
    logResult(updateEp, uRes.status === 200 ? 'PASS' : 'FAIL', uRes);
    expect(uRes.status).toBe(200);

    // Assets
    await runCrudTest(
      'Assets',
      '/assets',
      { name: 'Laptop', purchase_value: 1000 },
      { name: 'MacBook' }
    );
  });

  test('🏦 Module: Finance (Extended)', async () => {
    await runCrudTest(
      'Mortgages',
      '/finance/mortgages',
      { name: 'House', amount: 200000, provider: 'Bank' },
      { amount: 190000 }
    );
    await runCrudTest(
      'Loans',
      '/finance/loans',
      { name: 'Car Loan', amount: 5000 },
      { amount: 4500 }
    );
    await runCrudTest(
      'Vehicle Finance',
      '/finance/vehicle-finance',
      { name: 'Lease', amount: 300 },
      { amount: 250 }
    );
    await runCrudTest(
      'Current Accounts',
      '/finance/current-accounts',
      { account_name: 'Checking', current_balance: 1000, bank_name: 'TestBank' },
      { current_balance: 1200 }
    );
  });
});
