import { faker } from '@faker-js/faker';
import { User, Household, RecurringCost, generateUuidV7 } from './index';

/**
 * Item 142: Shared Mock Factories
 * Standardized data generation for Tests, Stories, and Seeding.
 */

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  email: faker.internet.email().toLowerCase(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  avatar: faker.image.avatar(),
  system_role: 'user',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockHousehold = (overrides: Partial<Household> = {}): Household => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  name: `${faker.person.lastName()} Residence`,
  currency: 'GBP',
  is_test: 0,
  ...overrides,
});

export const createMockRecurringCost = (overrides: Partial<RecurringCost> = {}): RecurringCost => ({
  id: generateUuidV7(),
  name: faker.commerce.productName(),
  amount: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
  frequency: 'monthly',
  is_active: 1,
  category_id: 'subscription',
  ...overrides,
});
