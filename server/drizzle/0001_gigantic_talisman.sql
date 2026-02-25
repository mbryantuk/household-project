CREATE TYPE "public"."system_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."theme_mode" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member', 'viewer');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT false,
	"rollout_percentage" integer DEFAULT 0,
	"criteria" jsonb,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"webauthn_user_id" text,
	"public_key" text,
	"counter" integer,
	"device_type" text,
	"backed_up" boolean,
	"transports" text,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_type" text,
	"suite_name" text,
	"passes" integer,
	"fails" integer,
	"total" integer,
	"duration" real,
	"report_json" text,
	"version" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"device_info" text,
	"ip_address" text,
	"user_agent" text,
	"last_active" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "version_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" text,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_households" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_households" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_households" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user_households" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "system_role" SET DEFAULT 'user'::"public"."system_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "system_role" SET DATA TYPE "public"."system_role" USING "system_role"::"public"."system_role";--> statement-breakpoint
ALTER TABLE "user_households" ADD CONSTRAINT "user_households_user_id_household_id_pk" PRIMARY KEY("user_id","household_id");--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "address_street" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "address_city" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "address_zip" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "date_format" text DEFAULT 'DD/MM/YYYY';--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "decimals" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "enabled_modules" text DEFAULT '["pets", "vehicles", "meals"]';--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "metadata_schema" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "auto_backup" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "backup_retention" integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "debug_mode" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "nightly_version_filter" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_households" ADD COLUMN "joined_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_households" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dashboard_layout" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sticky_note" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "budget_settings" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'hearth';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "custom_theme" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mode" "theme_mode" DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_test" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_challenge" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "active_session_idx" ON "user_sessions" USING btree ("is_revoked") WHERE "user_sessions"."is_revoked" = false;--> statement-breakpoint
CREATE INDEX "production_hh_idx" ON "households" USING btree ("is_test") WHERE "households"."is_test" = 0;--> statement-breakpoint
CREATE INDEX "active_hh_link_idx" ON "user_households" USING btree ("is_active") WHERE "user_households"."is_active" = true;--> statement-breakpoint
CREATE INDEX "active_user_idx" ON "users" USING btree ("is_active") WHERE "users"."is_active" = true;