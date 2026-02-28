CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"household_id" integer,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'member',
	"token" text NOT NULL,
	"invited_by" integer,
	"expires_at" timestamp NOT NULL,
	"is_accepted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_ip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "allowed_countries" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_key_user_hh_idx" ON "api_keys" USING btree ("user_id","household_id");--> statement-breakpoint
CREATE INDEX "invite_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invite_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_hh_created_idx" ON "audit_logs" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "rc_hh_active_idx" ON "recurring_costs" USING btree ("household_id","is_active");--> statement-breakpoint
CREATE INDEX "rc_hh_cat_active_idx" ON "recurring_costs" USING btree ("household_id","category_id","is_active");--> statement-breakpoint
CREATE INDEX "test_results_created_idx" ON "test_results" USING btree ("created_at");