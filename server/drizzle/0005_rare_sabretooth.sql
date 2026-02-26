ALTER TABLE "users" ALTER COLUMN "theme" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "mode" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "mode" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "recurring_costs" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_beta" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_token_expires" timestamp;