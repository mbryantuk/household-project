CREATE TABLE "user_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar" text,
	"dashboard_layout" text,
	"sticky_note" text,
	"budget_settings" text,
	"theme" text DEFAULT 'hearth',
	"custom_theme" text,
	"mode" "theme_mode" DEFAULT 'system',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_households" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;