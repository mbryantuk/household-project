const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../App');

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

  // Item 107: Response Unwrap Helper
  const unwrap = (res) => (res.body.success ? res.body.data : res.body);

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
    await request(app).post('/api/auth/register').send({
      householdName: 'Viewer House',
      email: testData.viewer.email,
      password: testData.viewer.password,
    });
    await request(app).post('/api/auth/register').send({
      householdName: 'Member House',
      email: testData.member.email,
      password: testData.member.password,
    });

    const lAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: testData.admin.email, password: testData.admin.password });
    
    const adminData = unwrap(lAdmin);
    tokens.admin = adminData.token;
    householdId = adminData.user.defaultHouseholdId || adminData.user.default_household_id;

    await request(app)
      .post(`/api/households/${householdId}/users`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ email: testData.viewer.email, role: 'viewer' });
    await request(app)
      .post(`/api/households/${householdId}/users`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ email: testData.member.email, role: 'member' });

    const lViewer = await request(app)
      .post('/api/auth/login')
      .send({ email: testData.viewer.email, password: testData.viewer.password });
    tokens.viewer = unwrap(lViewer).token;

    const lMember = await request(app)
      .post('/api/auth/login')
      .send({ email: testData.member.email, password: testData.member.password });
    tokens.member = unwrap(lMember).token;

    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    await request(app)
      .post(`/api/households/${householdId}/select`)
      .set('Authorization', `Bearer ${tokens.member}`);
  });

  afterAll(async () => {
    addStep('Cleaning up: Deleting test household.');
    if (householdId)
      await request(app)
        .delete(`/api/households/${householdId}`)
        .set('Authorization', `Bearer ${tokens.admin}`);

    const totalEndpoints = testedEndpoints.size;
    const passedEndpoints = Object.values(apiStatus).filter((s) => s === 'PASS').length;
    const failedEndpoints = Object.values(apiStatus).filter((s) => s !== 'PASS').length;

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

    const cRes = await request(app)
      .post(resolvedBase)
      .set('Authorization', `Bearer ${tokens.member}`)
      .send(payload);
    
    const cData = unwrap(cRes);
    testedEndpoints.add(endpoints.create);
    logResult(endpoints.create, cRes.status < 300 ? 'PASS' : 'FAIL', cRes);
    expect(cRes.status).toBeLessThan(300);
    const itemId = cData.id;

    testedEndpoints.add(endpoints.list);
    const lRes = await request(app)
      .get(resolvedBase)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    logResult(endpoints.list, lRes.status === 200 ? 'PASS' : 'FAIL', lRes);
    expect(lRes.status).toBe(200);

    if (itemId) {
      const itemPath = `${resolvedBase}/${itemId}`;

      if (swaggerPaths.includes(endpoints.read)) {
        testedEndpoints.add(endpoints.read);
        const iRes = await request(app)
          .get(itemPath)
          .set('Authorization', `Bearer ${tokens.viewer}`);
        logResult(endpoints.read, iRes.status === 200 ? 'PASS' : 'FAIL', iRes);
        expect(iRes.status).toBe(200);
      }

      testedEndpoints.add(endpoints.update);
      const uRes = await request(app)
        .put(itemPath)
        .set('Authorization', `Bearer ${tokens.member}`)
        .send(updatePayload);
      logResult(endpoints.update, uRes.status === 200 ? 'PASS' : 'FAIL', uRes);
      expect(uRes.status).toBe(200);

      testedEndpoints.add(endpoints.delete);
      const dRes = await request(app)
        .delete(itemPath)
        .set('Authorization', `Bearer ${tokens.member}`);
      logResult(endpoints.delete, dRes.status === 200 ? 'PASS' : 'FAIL', dRes);
      expect(dRes.status).toBe(200);
    }
  };

  test('🔑 Authentication & Setup', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        householdName: 'Coverage House',
        email: `coverage_${uniqueId}@test.com`,
        password: 'Password123!',
      });
    expect(regRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: `coverage_${uniqueId}@test.com`, password: 'Password123!' });
    expect(loginRes.status).toBe(200);

    const pRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokens.member}`);
    expect(pRes.status).toBe(200);

    const upRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${tokens.member}`)
      .send({ firstName: 'UpdatedName' });
    expect(upRes.status).toBe(200);
  });

  test('🏠 Household Management', async () => {
    const cRes = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Secondary House' });
    expect(cRes.status).toBe(201);
    const newHouseId = unwrap(cRes).id;

    await request(app)
      .delete(`/api/households/${newHouseId}`)
      .set('Authorization', `Bearer ${tokens.admin}`);

    const gRes = await request(app)
      .get(`/api/households/${householdId}`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(gRes.status).toBe(200);

    const uRes = await request(app)
      .put(`/api/households/${householdId}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Renamed Main House' });
    expect(uRes.status).toBe(200);
  });

  test('🔄 Module: Recurring Costs (Consolidated)', async () => {
    await runCrudTest(
      'Recurring Costs',
      '/finance/recurring-costs',
      { name: 'Spotify', amount: 10, category_id: 'subscription', frequency: 'monthly' },
      { name: 'Spotify Duo' }
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
    await runCrudTest(
      'Credit Cards',
      '/finance/credit-cards',
      { card_name: 'V' },
      { card_name: 'M' }
    );
    await runCrudTest('Investments', '/finance/investments', { name: 'S' }, { name: 'I' });
    await runCrudTest('Pensions', '/finance/pensions', { plan_name: 'N' }, { plan_name: 'P' });
    await runCrudTest('Savings', '/finance/savings', { account_name: 'R' }, { account_name: 'S' });
  });

  test('🍱 Module: Meals', async () => {
    const res = await request(app)
      .get(`/api/households/${householdId}/meals`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    expect(res.status).toBe(200);

    const mRes = await request(app)
      .post(`/api/households/${householdId}/meals`)
      .set('Authorization', `Bearer ${tokens.member}`)
      .send({ name: 'Pasta', day: 'Monday', meal_type: 'Dinner' });
    expect(mRes.status).toBe(201);
  });

  test('🧹 Module: Chores', async () => {
    await runCrudTest(
      'Chores',
      '/chores',
      { name: 'Dishes', frequency: 'daily', value: 5 },
      { name: 'Wash Dishes', value: 10 }
    );

    const sRes = await request(app)
      .get(`/api/households/${householdId}/chores/stats`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    expect(sRes.status).toBe(200);
  });

  test('📅 Module: Calendar', async () => {
    const hRes = await request(app).get(`/api/system/holidays`);
    expect(hRes.status).toBe(200);

    await runCrudTest(
      'Calendar Dates',
      '/calendar',
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

    const cRes = await request(app)
      .delete(`/api/households/${householdId}/shopping-list/clear`)
      .set('Authorization', `Bearer ${tokens.member}`);
    expect(cRes.status).toBe(200);
  });

  test('🏠 Module: House Details', async () => {
    const dRes = await request(app)
      .get(`/api/households/${householdId}/details`)
      .set('Authorization', `Bearer ${tokens.viewer}`);
    expect(dRes.status).toBe(200);

    const uRes = await request(app)
      .put(`/api/households/${householdId}/details`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ addressStreet: '123 New St' });
    expect(uRes.status).toBe(200);

    await runCrudTest(
      'Assets',
      '/assets',
      { name: 'Laptop', purchase_value: 1000 },
      { name: 'MacBook' }
    );
  });

  test('🏦 Module: Finance (Extended)', async () => {
    await runCrudTest('Mortgages', '/finance/mortgages', { name: 'H' }, { name: 'M' });
    await runCrudTest('Loans', '/finance/loans', { name: 'C' }, { name: 'L' });
    await runCrudTest('Vehicle Finance', '/finance/vehicle-finance', { name: 'T' }, { name: 'V' });
  });
});
