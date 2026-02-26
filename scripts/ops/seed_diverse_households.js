const http = require('http');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const VERSION = pkg.version;
const PRIMARY_USER = 'mbryantuk@gmail.com';
// Item 131: Non-sensitive default for tests
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'DiverseSeed123!';

function apiRequest(method, urlPath, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'localhost',
      port: 4001,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-maintenance': 'true',
      },
      timeout: 10000,
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed = {};
        try {
          parsed = body ? JSON.parse(body) : {};
        } catch (e) {
          parsed = body;
        }
        if (res.statusCode >= 400) reject({ status: res.statusCode, data: parsed, path: urlPath });
        else
          resolve({
            status: res.statusCode,
            data: parsed && parsed.success ? parsed.data : parsed,
          });
      });
    });
    req.on('error', reject);
    if (data) req.write(payload);
    req.end();
  });
}

const PROFILES = [
  {
    name: 'The High-Flyer (Single Pro)',
    type: 'single_pro',
    members: [{ n: 'Alex', t: 'adult', e: '👔', d: '1992-05-15' }],
    house: { type: 'Luxury Apartment', val: 850000, price: 720000 },
    finance: { income: 12500, balance: 45000, overdraft: 5000 },
    costs: [
      { n: 'Equinox Gym', a: 250, c: 'fun_money' },
      { n: 'Amex Platinum', a: 550, c: 'subscription', f: 'yearly' },
      { n: 'Gigabit Fiber', a: 110, c: 'utility' },
    ],
  },
  {
    name: 'The Golden Years (Retired)',
    type: 'retired',
    members: [
      { n: 'Arthur', t: 'adult', e: '👴', d: '1955-08-20' },
      { n: 'Martha', t: 'adult', e: '👵', d: '1958-03-12' },
    ],
    house: { type: 'Detached Bungalow', val: 1200000, price: 150000 },
    finance: { income: 4500, balance: 120000, overdraft: 0 },
    costs: [
      { n: 'BUPA Health', a: 320, c: 'insurance' },
      { n: 'Garden Maintenance', a: 150, c: 'service' },
      { n: 'Classic Car Insurance', a: 85, c: 'insurance' },
    ],
  },
  {
    name: 'The Wilson Hub (Large Family)',
    type: 'large_family',
    members: [
      { n: 'David', t: 'adult', e: '👨', d: '1985-11-02' },
      { n: 'Sarah', t: 'adult', e: '👩', d: '1987-01-25' },
      { n: 'Leo', t: 'child', e: '👦', d: '2012-04-10' },
      { n: 'Mia', t: 'child', e: '👧', d: '2014-06-15' },
      { n: 'Toby', t: 'child', e: '👦', d: '2017-09-20' },
      { n: 'Ruby', t: 'child', e: '👧', d: '2020-12-05' },
    ],
    house: { type: 'Social Housing', val: 0, price: 0 },
    finance: { income: 3200, balance: 450, overdraft: 1000 },
    costs: [
      { n: 'School Meals', a: 180, c: 'education' },
      { n: 'After School Club', a: 240, c: 'care' },
      { n: 'Food Shop (Bulk)', a: 850, c: 'food' },
    ],
  },
  {
    name: 'Roomies 101 (Student House)',
    type: 'student_hmo',
    members: [
      { n: 'Josh', t: 'adult', e: '👱‍♂️', d: '2004-02-14' },
      { n: 'Becky', t: 'adult', e: '👱‍♀️', d: '2003-11-30' },
      { n: 'Mo', t: 'adult', e: '🧔', d: '2004-01-05' },
      { n: 'Chloe', t: 'adult', e: '👩', d: '2005-05-22' },
    ],
    house: { type: 'Rental HMO', val: 0, price: 0 },
    finance: { income: 4800, balance: 1200, overdraft: 2000 },
    costs: [
      { n: 'Shared Netflix', a: 15, c: 'subscription' },
      { n: 'Utility Split', a: 400, c: 'utility' },
      { n: 'Broadband', a: 45, c: 'utility' },
    ],
  },
  {
    name: 'The Miller Home (Single Parent)',
    type: 'single_parent',
    members: [
      { n: 'Sarah', t: 'adult', e: '👩', d: '1990-07-18' },
      { n: 'Daisy', t: 'child', e: '👧', d: '2018-02-10' },
      { n: 'Jack', t: 'child', e: '👦', d: '2021-05-05' },
    ],
    house: { type: 'Terraced House', val: 320000, price: 280000 },
    finance: { income: 2800, balance: 150, overdraft: 500 },
    costs: [
      { n: 'Nursery Fees', a: 1100, c: 'care' },
      { n: 'Dance Classes', a: 60, c: 'education' },
      { n: 'Life Insurance', a: 25, c: 'insurance' },
    ],
  },
  {
    name: 'The Tech Duo (DINKs)',
    type: 'dinks',
    members: [
      { n: 'Jamie', t: 'adult', e: '👨‍💻', d: '1994-10-10' },
      { n: 'Jordan', t: 'adult', e: '👩‍💻', d: '1995-02-28' },
    ],
    house: { type: 'Modern Semi', val: 550000, price: 480000 },
    finance: { income: 9500, balance: 35000, overdraft: 0 },
    costs: [
      { n: 'Tesla Lease', a: 650, c: 'vehicle_finance' },
      { n: 'Vanguard Auto-Invest', a: 2000, c: 'finance' },
      { n: 'Meal Kits (HelloFresh)', a: 320, c: 'food' },
    ],
  },
  {
    name: 'Green Pastures (Rural Pets)',
    type: 'rural_pets',
    members: [
      { n: 'Farmer Tom', t: 'adult', e: '👨‍🌾', d: '1975-01-01' },
      { n: 'Rover', t: 'pet', e: '🐕' },
      { n: 'Mittens', t: 'pet', e: '🐈' },
      { n: 'Barnaby', t: 'pet', e: '🐎' },
      { n: 'Goldie', t: 'pet', e: '🐕' },
    ],
    house: { type: 'Farmhouse', val: 950000, price: 400000 },
    finance: { income: 4200, balance: 8500, overdraft: 25000 },
    costs: [
      { n: 'Horse Insurance', a: 120, c: 'insurance' },
      { n: 'Vet Plan (All)', a: 85, c: 'vet' },
      { n: 'Heating Oil', a: 200, c: 'energy' },
    ],
  },
  {
    name: 'First Nest (Starter Family)',
    type: 'young_family',
    members: [
      { n: 'Ben', t: 'adult', e: '👨', d: '1998-12-12' },
      { n: 'Ella', t: 'adult', e: '👩', d: '1999-04-04' },
      { n: 'Baby Noah', t: 'child', e: '👶', d: '2025-08-01' },
    ],
    house: { type: 'New Build', val: 285000, price: 280000 },
    finance: { income: 4500, balance: 1200, overdraft: 0 },
    costs: [
      { n: 'High LTV Mortgage', a: 1650, c: 'mortgage' },
      { n: 'Student Loan (Ben)', a: 150, c: 'loan' },
      { n: 'Life Cover', a: 45, c: 'insurance' },
    ],
  },
  {
    name: 'Global Base (Nomads)',
    type: 'nomads',
    members: [
      { n: 'Luca', t: 'adult', e: '🌍', d: '1993-09-09' },
      { n: 'Elena', t: 'adult', e: '✈️', d: '1994-01-01' },
    ],
    house: { type: 'Studio Condo', val: 400000, price: 380000 },
    finance: { income: 8000, balance: 25000, overdraft: 0 },
    costs: [
      { n: 'Travel Insurance', a: 120, c: 'insurance' },
      { n: 'Co-working Space', a: 400, c: 'subscription' },
      { n: 'Cloud Storage', a: 35, c: 'subscription' },
    ],
  },
  {
    name: 'The Ancestral Home (Multi-Gen)',
    type: 'multi_gen',
    members: [
      { n: 'Grandad Joe', t: 'adult', e: '👴', d: '1948-05-05' },
      { n: 'Nanna Rose', t: 'adult', e: '👵', d: '1950-10-10' },
      { n: 'Mike', t: 'adult', e: '👨', d: '1978-02-20' },
      { n: 'Jenny', t: 'adult', e: '👩', d: '1980-03-30' },
      { n: 'Timmy', t: 'child', e: '👦', d: '2015-05-05' },
    ],
    house: { type: 'Manor House', val: 1850000, price: 250000 },
    finance: { income: 11500, balance: 15000, overdraft: 0 },
    costs: [
      { n: 'Care Support', a: 800, c: 'care' },
      { n: 'Private Schooling', a: 1500, c: 'education' },
      { n: 'Massive Council Tax', a: 450, c: 'council' },
    ],
  },
];

async function seed() {
  console.log(`🚀 LAUNCHING DIVERSE HOUSEHOLD SEED (10 PROFILES)`);

  try {
    for (const profile of PROFILES) {
      console.log(`
📍 Seeding Profile: ${profile.name}`);

      // 1. Register & Login
      const adminEmail = `admin.${profile.type}.${Date.now()}@test.com`;
      await apiRequest('POST', '/api/auth/register', {
        householdName: profile.name,
        email: adminEmail,
        password: SEED_PASSWORD,
        is_test: 1,
      });

      const login = await apiRequest('POST', '/api/auth/login', {
        email: adminEmail,
        password: SEED_PASSWORD,
      });
      const token = login.data.token;
      const hhId = login.data.user.defaultHouseholdId;

      // 2. Link Primary User
      await apiRequest(
        'POST',
        `/api/households/${hhId}/users`,
        { email: PRIMARY_USER, role: 'admin' },
        token
      );

      // 3. Create Financial Profile
      const profRes = await apiRequest(
        'POST',
        `/api/households/${hhId}/finance/profiles`,
        { name: 'Main Ledger', emoji: '💰', is_default: true },
        token
      );
      const profileId = profRes.data.id;

      // 4. House Details
      await apiRequest(
        'PUT',
        `/api/households/${hhId}/details`,
        {
          purchase_price: profile.house.price,
          current_valuation: profile.house.val,
          property_type: profile.house.type,
          tenure: 'freehold',
        },
        token
      );

      // 5. Members
      const members = {};
      for (const m of profile.members) {
        const res = await apiRequest(
          'POST',
          `/api/households/${hhId}/members`,
          { first_name: m.n, type: m.t, emoji: m.e, dob: m.d },
          token
        );
        members[m.n] = res.data.id;
      }

      // 6. Bank Account
      const bank = await apiRequest(
        'POST',
        `/api/households/${hhId}/finance/current-accounts`,
        {
          bank_name: 'Hearthstone Bank',
          account_name: 'Primary Account',
          current_balance: profile.finance.balance,
          overdraft_limit: profile.finance.overdraft,
          emoji: '🏦',
          financial_profile_id: profileId,
        },
        token
      );
      const bankId = bank.data.id;

      // 7. Costs
      for (const c of profile.costs) {
        await apiRequest(
          'POST',
          `/api/households/${hhId}/finance/recurring-costs`,
          {
            name: c.n,
            amount: c.a,
            category_id: c.c,
            frequency: c.f || 'monthly',
            day_of_month: 1,
            object_type: 'household',
            bank_account_id: bankId,
            financial_profile_id: profileId,
          },
          token
        );
      }

      // 8. Utilities
      if (profile.type !== 'student_hmo') {
        await apiRequest(
          'POST',
          `/api/households/${hhId}/utilities/energy`,
          { provider: 'PowerCorp', monthly_amount: 150, payment_day: 15 },
          token
        );
        await apiRequest(
          'POST',
          `/api/households/${hhId}/utilities/water`,
          { provider: 'PureWater', monthly_amount: 40, payment_day: 15 },
          token
        );
      }

      console.log(`✅ Profile Complete: ${profile.name} (HH ID: ${hhId})`);
    }

    console.log(`
🎉 ALL 10 DIVERSE PROFILES SEEDED SUCCESSFULLY.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Failed:', err);
    process.exit(1);
  }
}

seed();
