ALTER TABLE "households" ADD COLUMN "manual_exchange_rates" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "guest_token" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "guest_token_expires" timestamp;