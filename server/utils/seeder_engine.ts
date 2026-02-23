import { faker } from '@faker-js/faker';

/**
 * Deterministic Seeder Engine
 * Provides realistic, repeatable data generation using Faker.
 */
export class SeederEngine {
  constructor(seed: number = 12345) {
    faker.seed(seed);
  }

  generateUser(overrides = {}) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: 'Password123!',
      first_name: firstName,
      last_name: lastName,
      ...overrides,
    };
  }

  generateMember(householdId: number, overrides = {}) {
    const type = faker.helpers.arrayElement(['adult', 'child', 'pet']);
    const firstName = type === 'pet' ? faker.animal.dog() : faker.person.firstName();
    return {
      household_id: householdId,
      first_name: firstName,
      type,
      emoji: type === 'pet' ? '🐾' : type === 'child' ? '👶' : '👨',
      dob: faker.date
        .birthdate({ mode: 'age', min: type === 'child' ? 2 : 18, max: type === 'child' ? 17 : 80 })
        .toISOString()
        .split('T')[0],
      ...overrides,
    };
  }

  generateAsset(householdId: number, overrides = {}) {
    return {
      household_id: householdId,
      name: faker.commerce.productName(),
      category: faker.helpers.arrayElement(['Electronics', 'Furniture', 'Appliance', 'Tool']),
      purchase_value: parseFloat(faker.commerce.price({ min: 100, max: 5000 })),
      insurance_status: faker.helpers.arrayElement(['insured', 'uninsured', 'self-insured']),
      emoji: '📦',
      ...overrides,
    };
  }

  generateVehicle(householdId: number, overrides = {}) {
    return {
      household_id: householdId,
      make: faker.vehicle.manufacturer(),
      model: faker.vehicle.model(),
      type: 'Car',
      registration: faker.vehicle.vrm(),
      purchase_value: parseFloat(faker.commerce.price({ min: 10000, max: 80000 })),
      current_value: parseFloat(faker.commerce.price({ min: 5000, max: 70000 })),
      emoji: '🚗',
      ...overrides,
    };
  }

  generateCurrentAccount(householdId: number, overrides = {}) {
    return {
      household_id: householdId,
      bank_name: faker.company.name() + ' Bank',
      account_name: 'Main Checking',
      current_balance: parseFloat(faker.commerce.price({ min: 1000, max: 20000 })),
      overdraft_limit: 500,
      emoji: '🏦',
      ...overrides,
    };
  }

  generateIncome(householdId: number, memberId: number, accountId: number, overrides = {}) {
    return {
      household_id: householdId,
      member_id: memberId,
      bank_account_id: accountId,
      employer: faker.company.name(),
      amount: parseFloat(faker.commerce.price({ min: 2000, max: 10000 })),
      payment_day: faker.number.int({ min: 1, max: 28 }),
      is_primary: 1,
      ...overrides,
    };
  }
}
