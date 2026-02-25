const request = require('supertest');
const app = require('../App');
const fs = require('fs');
const path = require('path');

// Increase timeout for the massive seed operation
jest.setTimeout(60000);

describe('👪 Master Seed: The Brady Bunch', () => {
  let token;
  let hhId;
  const RUN_ID = Date.now();
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
  const VERSION = pkg.version;
  const DATE_STR = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

  const HOUSEHOLD_NAME = `The Brady Bunch (API) v${VERSION} [${DATE_STR}]`;
  const ADMIN_EMAIL = `mike.brady.${RUN_ID}@test.com`;
  const PASSWORD = 'Password123!';
  const PRIMARY_USER = 'mbryantuk@gmail.com';

  const unwrap = (res) => (res.body.success ? res.body.data : res.body);

  test('Should successfully seed the entire Brady Bunch household via API', async () => {
    console.log(`🚀 Seeding Master Household: ${HOUSEHOLD_NAME}`);

    // 1. SETUP: Register & Login
    const regRes = await request(app)
      .post('/api/auth/register')
      .set('x-bypass-maintenance', 'true')
      .send({ householdName: HOUSEHOLD_NAME, email: ADMIN_EMAIL, password: PASSWORD, is_test: 1 });
    expect(regRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('x-bypass-maintenance', 'true')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(loginRes.status).toBe(200);
    token = unwrap(loginRes).token;

    // Get Household ID
    const hhRes = await request(app)
      .get('/api/auth/my-households')
      .set('Authorization', `Bearer ${token}`);
    hhId = unwrap(hhRes)[0].id;
    expect(hhId).toBeDefined();

    // Select Household
    await request(app)
      .post(`/api/households/${hhId}/select`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Add Primary User (mbryantuk@gmail.com)
    await request(app)
      .post(`/api/households/${hhId}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: PRIMARY_USER, role: 'admin', first_name: 'Matt', password: PASSWORD });

    // 2. HOUSE DETAILS
    await request(app)
      .put(`/api/households/${hhId}/details`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        purchase_price: 61000,
        current_valuation: 2450000,
        property_type: 'Brady Residence',
        construction_year: 1969,
        tenure: 'freehold',
        council_tax_band: 'G',
        broadband_provider: 'Spectrum',
        broadband_account: 'SP-99887766',
        wifi_password: 'GroovyPassword123',
        smart_home_hub: 'Alexa',
      });

    // 3. MEMBERS
    const members = {};
    const memberDefs = [
      { n: 'Mike', t: 'adult', e: '👨', d: '1978-05-12' },
      { n: 'Carol', t: 'adult', e: '👩', d: '1982-02-14' },
      { n: 'Greg', t: 'adult', e: '👦', d: '2004-10-20' },
      { n: 'Marcia', t: 'adult', e: '👧', d: '2006-08-05' },
      { n: 'Peter', t: 'child', e: '👦', d: '2008-02-10' },
      { n: 'Jan', t: 'child', e: '👧', d: '2011-01-02' },
      { n: 'Bobby', t: 'child', e: '👦', d: '2013-11-23' },
      { n: 'Cindy', t: 'child', e: '👧', d: '2016-07-08' },
      { n: 'Alice', t: 'adult', e: '👵', d: '1968-09-30' },
      { n: 'Tiger', t: 'pet', e: '🐕', d: null },
      { n: 'Fluffy', t: 'pet', e: '🐈', d: null },
    ];

    for (const m of memberDefs) {
      const payload = { first_name: m.n, type: m.t, emoji: m.e };
      if (m.d) payload.dob = m.d;
      const res = await request(app)
        .post(`/api/households/${hhId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(res.status).toBe(201);
      members[m.n] = unwrap(res).id;
    }

    // 4. ASSETS
    const assetDefs = [
      { n: 'TV', c: 'Electronics', l: 'Living Room', v: 1200 },
      { n: 'Laptop', c: 'Electronics', l: 'Office', v: 2400 },
    ];

    for (const a of assetDefs) {
      await request(app)
        .post(`/api/households/${hhId}/assets`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: a.n, category: a.c, location: a.l, purchase_value: a.v });
    }

    // 5. VEHICLES
    const v1Res = await request(app)
      .post(`/api/households/${hhId}/vehicles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Tesla', model: 'Model S', purchase_value: 85000 });
    const v1Id = unwrap(v1Res).id;

    // 6. RECURRING COSTS
    await request(app)
      .post(`/api/households/${hhId}/finance/recurring-costs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', amount: 15, category_id: 'subscription', frequency: 'monthly' });

    // 7. FINANCIAL ACCOUNTS
    const bankRes = await request(app)
      .post(`/api/households/${hhId}/finance/current-accounts`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bank_name: 'Wells Fargo', account_name: 'Checking', current_balance: 9300 });
    const bankId = unwrap(bankRes).id;

    const mikeIncRes = await request(app)
      .post(`/api/households/${hhId}/finance/income`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employer: 'Brady Arch', amount: 9500, payment_day: 28, bank_account_id: bankId, member_id: members.Mike });
    const mikeIncId = unwrap(mikeIncRes).id;

    // 8. DEBT
    const mortRes = await request(app)
      .post(`/api/households/${hhId}/finance/mortgages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lender: 'Nationwide', monthly_payment: 1850 });
    expect(mortRes.status).toBe(201);

    // 9. MEALS
    const mRes = await request(app)
      .post(`/api/households/${hhId}/meals`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Meatloaf', category: 'dinner' });
    const mealId = unwrap(mRes).id;

    console.log(`✅ Master Seed Test Complete: ID ${hhId}`);
  });
});
