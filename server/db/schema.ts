import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * HEARTHSTONE PRO CORE SCHEMA (Postgres Transition)
 * This schema replaces the legacy SQLite globals.
 */

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatar: text('avatar'),
  systemRole: text('system_role').default('user'),
  defaultHouseholdId: integer('default_household_id'),
  lastHouseholdId: integer('last_household_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

export const households = pgTable('households', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  currency: text('currency').default('GBP'),
  isTest: integer('is_test').default(0),
  createdAt: timestamp('created_at').defaultNow()
});

export const userHouseholds = pgTable('user_households', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  householdId: integer('household_id').references(() => households.id, { onDelete: 'cascade' }),
  role: text('role').default('member'),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  pk: [table.userId, table.householdId],
}));
