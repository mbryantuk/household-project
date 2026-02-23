import { SeederEngine } from '../utils/seeder_engine';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4001/api';
const SEED_VALUE = parseInt(process.env.SEED || '12345');

async function runSeed() {
  const engine = new SeederEngine(SEED_VALUE);
  const admin = engine.generateUser({ email: `admin-${SEED_VALUE}@test.com` });

  console.log(`🌱 Starting deterministic seed with value: ${SEED_VALUE}`);

  try {
    // 1. Register Admin
    await axios.post(
      `${API_URL}/auth/register`,
      {
        householdName: `Seed Household ${SEED_VALUE}`,
        email: admin.email,
        password: admin.password,
        is_test: 1,
      },
      { headers: { 'x-bypass-maintenance': 'true' } }
    );

    // 2. Login
    const loginRes = await axios.post(
      `${API_URL}/auth/login`,
      {
        email: admin.email,
        password: admin.password,
      },
      { headers: { 'x-bypass-maintenance': 'true' } }
    );

    const { token, household } = loginRes.data;
    const householdId = household.id;
    const authHeader = { Authorization: `Bearer ${token}`, 'x-bypass-maintenance': 'true' };

    console.log(`✅ Registered & Logged in. Household ID: ${householdId}`);

    // 3. Create Members
    const members = [];
    for (let i = 0; i < 5; i++) {
      const member = engine.generateMember(householdId);
      const res = await axios.post(`${API_URL}/households/${householdId}/members`, member, {
        headers: authHeader,
      });
      members.push(res.data);
    }
    console.log(`✅ Created 5 members.`);

    // 4. Create Bank Accounts
    const accounts = [];
    for (let i = 0; i < 2; i++) {
      const acc = engine.generateCurrentAccount(householdId);
      const res = await axios.post(
        `${API_URL}/households/${householdId}/finance/current-accounts`,
        acc,
        { headers: authHeader }
      );
      accounts.push(res.data);
    }
    console.log(`✅ Created 2 bank accounts.`);

    // 5. Create Assets
    for (let i = 0; i < 5; i++) {
      const asset = engine.generateAsset(householdId);
      await axios.post(`${API_URL}/households/${householdId}/assets`, asset, {
        headers: authHeader,
      });
    }
    console.log(`✅ Created 5 assets.`);

    // 6. Create Vehicles
    for (let i = 0; i < 2; i++) {
      const vehicle = engine.generateVehicle(householdId);
      await axios.post(`${API_URL}/households/${householdId}/vehicles`, vehicle, {
        headers: authHeader,
      });
    }
    console.log(`✅ Created 2 vehicles.`);

    console.log('🏁 Deterministic seed complete!');
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    console.error('❌ Seed failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runSeed();
