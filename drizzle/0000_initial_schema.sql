CREATE TYPE "confidence_level" AS ENUM('زیاد', 'متوسط', 'کم', 'در معرض خطر');
--> statement-breakpoint
CREATE TYPE "initiative_status" AS ENUM('شروع نشده', 'در حال انجام', 'تکمیل شده', 'مسدود شده');
--> statement-breakpoint
CREATE TYPE "risk_status" AS ENUM('فعال', 'در حال بررسی', 'حل شده');
--> statement-breakpoint
CREATE TYPE "role" AS ENUM('admin', 'member');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "active_okr_cycles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"frequency" varchar(50) NOT NULL,
	"check_in_day_of_week" integer NOT NULL,
	"evaluation_date" date,
	CONSTRAINT "calendar_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "initiatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_result_id" integer NOT NULL,
	"description" text NOT NULL,
	"status" "initiative_status" DEFAULT 'شروع نشده' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"link" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_links_team_id_unique" UNIQUE("team_id"),
	CONSTRAINT "invitation_links_link_unique" UNIQUE("link")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "key_result_assignees" (
	"key_result_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	CONSTRAINT "key_result_assignees_key_result_id_member_id_pk" PRIMARY KEY("key_result_id","member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "key_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"objective_id" integer NOT NULL,
	"description" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"confidence_level" "confidence_level" DEFAULT 'متوسط' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "objectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"team_id" integer NOT NULL,
	"cycle_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "okr_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"owner_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risks" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_result_id" integer NOT NULL,
	"description" text NOT NULL,
	"corrective_action" text NOT NULL,
	"status" "risk_status" DEFAULT 'فعال' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"initiative_id" integer NOT NULL,
	"description" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_memberships" (
	"user_id" text NOT NULL,
	"team_id" integer NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_memberships_user_id_team_id_pk" PRIMARY KEY("user_id","team_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"username" varchar(50) NOT NULL,
	"hashedPassword" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificationTokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationTokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "active_okr_cycles" ADD CONSTRAINT "active_okr_cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "active_okr_cycles" ADD CONSTRAINT "active_okr_cycles_cycle_id_okr_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."okr_cycles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_settings" ADD CONSTRAINT "calendar_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation_links" ADD CONSTRAINT "invitation_links_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation_links" ADD CONSTRAINT "invitation_links_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "key_result_assignees" ADD CONSTRAINT "key_result_assignees_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "key_result_assignees" ADD CONSTRAINT "key_result_assignees_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members" ADD CONSTRAINT "members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objectives" ADD CONSTRAINT "objectives_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "objectives" ADD CONSTRAINT "objectives_cycle_id_okr_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."okr_cycles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "okr_cycles" ADD CONSTRAINT "okr_cycles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risks" ADD CONSTRAINT "risks_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
