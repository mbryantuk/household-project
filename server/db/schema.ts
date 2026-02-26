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
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * HEARTHSTONE PRO CORE SCHEMA (Postgres)
 * Item 102: Decoupled Identity (users) from Profile (user_profiles).
 */

export const systemRoleEnum = pgEnum('system_role', ['admin', 'user']);
export const themeModeEnum = pgEnum('theme_mode', ['light', 'dark', 'system']);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    username: text('username').unique(),
    passwordHash: text('password_hash'),
    systemRole: systemRoleEnum('system_role').default('user'),
    defaultHouseholdId: integer('default_household_id'),
    lastHouseholdId: integer('last_household_id'),
    isTest: integer('is_test').default(0),
    isActive: boolean('is_active').default(true),
    isBeta: boolean('is_beta').default(false),
    mfaEnabled: boolean('mfa_enabled').default(false),
    mfaSecret: text('mfa_secret'),
    currentChallenge: text('current_challenge'),
    resetToken: text('reset_token'),
    resetTokenExpires: timestamp('reset_token_expires'),
    version: integer('version').default(1).notNull(),

    // LEGACY COLUMNS (Moved to user_profiles, but kept here to avoid blocking db:push)
    firstName: text('first_name'),
    lastName: text('last_name'),
    avatar: text('avatar'),
    dashboardLayout: text('dashboard_layout'),
    stickyNote: text('sticky_note'),
    budgetSettings: text('budget_settings'),
    theme: text('theme'),
    customTheme: text('custom_theme'),
    mode: text('mode'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    activeIdx: index('active_user_idx')
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  })
);

export const userProfiles = pgTable('user_profiles', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatar: text('avatar'),
  dashboardLayout: text('dashboard_layout'),
  stickyNote: text('sticky_note'),
  budgetSettings: text('budget_settings'),
  theme: text('theme').default('hearth'),
  customTheme: text('custom_theme'),
  mode: themeModeEnum('mode').default('system'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userSessions = pgTable(
  'user_sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    deviceInfo: text('device_info'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    lastActive: timestamp('last_active').defaultNow(),
    expiresAt: timestamp('expires_at'),
    isRevoked: boolean('is_revoked').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    activeSessionIdx: index('active_session_idx')
      .on(table.isRevoked)
      .where(sql`${table.isRevoked} = false`),
  })
);

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
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const households = pgTable(
  'households',
  {
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
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    productionHhIdx: index('production_hh_idx')
      .on(table.isTest)
      .where(sql`${table.isTest} = 0`),
  })
);

export const userRoleEnum = pgEnum('user_role', ['admin', 'member', 'viewer']);

export const userHouseholds = pgTable(
  'user_households',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').default('member'),
    isActive: boolean('is_active').default(true),
    joinedAt: timestamp('joined_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.householdId] }),
    activeHhLinkIdx: index('active_hh_link_idx')
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  })
);

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  householdId: integer('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recurringCosts = pgTable('recurring_costs', {
  id: serial('id').primaryKey(),
  householdId: integer('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  frequency: text('frequency').default('monthly'),
  categoryId: text('category_id'),
  memberId: integer('member_id').references(() => users.id, { onDelete: 'set null' }),
  startDate: timestamp('start_date').defaultNow(),
  isActive: boolean('is_active').default(true),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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

export const featureFlags = pgTable('feature_flags', {
  id: text('id').primaryKey(),
  description: text('description'),
  isEnabled: boolean('is_enabled').default(false),
  rolloutPercentage: integer('rollout_percentage').default(0),
  criteria: jsonb('criteria'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
