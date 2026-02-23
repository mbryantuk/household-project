import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').defaultNow(),
});

export const households = pgTable('households', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  currency: text('currency').default('GBP'),
  isTest: integer('is_test').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userHouseholds = pgTable(
  'user_households',
  {
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    householdId: integer('household_id').references(() => households.id, { onDelete: 'cascade' }),
    role: text('role').default('member'),
    isActive: boolean('is_active').default(true),
  },
  (table) => ({
    pk: [table.userId, table.householdId],
  })
);

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  householdId: integer('household_id').notNull(),
  userId: integer('user_id'),
  action: text('action').notNull(), // e.g., 'MEMBER_CREATE', 'FINANCE_DELETE'
  entityType: text('entity_type'), // e.g., 'member', 'asset'
  entityId: integer('entity_id'),
  metadata: jsonb('metadata'), // Snapshot of changes or context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});
