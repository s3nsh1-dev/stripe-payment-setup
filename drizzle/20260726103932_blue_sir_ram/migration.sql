CREATE TYPE "subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired');--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL UNIQUE,
	"plan" "plan" DEFAULT 'FREE'::"plan" NOT NULL,
	"status" "subscription_status",
	"stripe_customer_id" text UNIQUE,
	"stripe_subscription_id" text UNIQUE,
	"stripe_price_id" text,
	"stripe_current_period_end" timestamp,
	"stripe_cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "plan";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripeCustomerId";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripeSubscriptionId";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripePriceId";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripeCurrentPeriodEnd";--> statement-breakpoint
CREATE INDEX "subscription_userId_idx" ON "subscription" ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_stripeCustomerId_idx" ON "subscription" ("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;