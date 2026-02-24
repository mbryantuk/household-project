import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  real,
  primaryKey,
} from 'drizzle-orm/pg-core';

/**
 * HEARTHSTONE PRO CORE SCHEMA (Postgres)
 * This is the source of truth for Identity, Tenancy, and Audit.
 */

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash'), // Nullable for Passkey-only users
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatar: text('avatar'),
  systemRole: text('system_role').default('user'),
  dashboardLayout: text('dashboard_layout'),
  stickyNote: text('sticky_note'),
  budgetSettings: text('budget_settings'),
  theme: text('theme').default('hearth'),
  customTheme: text('custom_theme'), // PERSISTENCE FIX: Added missing custom_theme column
  mode: text('mode').default('system'),
  defaultHouseholdId: integer('default_household_id'),
  lastHouseholdId: integer('last_household_id'),
  isTest: integer('is_test').default(0),
  isActive: boolean('is_active').default(true),
  mfaEnabled: boolean('mfa_enabled').default(false),
  mfaSecret: text('mfa_secret'),
  currentChallenge: text('current_challenge'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  deviceInfo: text('device_info'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  lastActive: timestamp('last_active').defaultNow(),
  expiresAt: timestamp('expires_at'),
  isRevoked: boolean('is_revoked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const passkeys = pgTable('passkeys', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  webauthnUserId: text('webauthn_user_id'),
  publicKey: text('public_key'),
  counter: integer('counter'),
  deviceType: text('device_type'),
  backedUp: boolean('backed_up'),
  transports: text('transports'), // JSON string
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
});

export const households = pgTable('households', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  addressStreet: text('address_street'),
  addressCity: text('address_city'),
  addressZip: text('address_zip'),
  avatar: text('avatar'),
  dateFormat: text('date_format').default('DD/MM/YYYY'),
  currency: text('currency').default('GBP'),
  decimals: integer('decimals').default(2),
  enabledModules: text('enabled_modules').default('["pets", "vehicles", "meals"]'),
  metadataSchema: text('metadata_schema'),
  autoBackup: boolean('auto_backup').default(true),
  backupRetention: integer('backup_retention').default(7),
  isTest: integer('is_test').default(0),
  debugMode: integer('debug_mode').default(0),
  nightlyVersionFilter: text('nightly_version_filter'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userHouseholds = pgTable(
  'user_households',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    role: text('role').default('member'),
    isActive: boolean('is_active').default(true),
    joinedAt: timestamp('joined_at').defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.householdId] }),
  })
);

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  householdId: integer('household_id').notNull(),
  userId: integer('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const testResults = pgTable('test_results', {
  id: serial('id').primaryKey(),
  testType: text('test_type'),
  suiteName: text('suite_name'),
  passes: integer('passes'),
  fails: integer('fails'),
  total: integer('total'),
  duration: real('duration'),
  reportJson: text('report_json'),
  version: text('version'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const versionHistory = pgTable('version_history', {
  id: serial('id').primaryKey(),
  version: text('version'),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});
