CREATE TYPE "public"."plan" AS ENUM('FREE', 'PRO', 'PREMIUM');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan" "plan" DEFAULT 'FREE'::"plan" NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripeCustomerId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripeSubscriptionId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripePriceId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripeCurrentPeriodEnd" text;