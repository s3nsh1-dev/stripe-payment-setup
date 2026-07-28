import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/config/db.connect";
import { requireAuth } from "@/server/lib/auth-guard";
import { STRIPE_CLIENT } from "@/server/lib/stripe";
import { subscription } from "@/server/schema";

export async function POST() {
  try {
    const userSession = await requireAuth();
    const userId = userSession.user.id;
    const rows = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId));
    const currentSubscription = rows[0];

    if (!currentSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { message: "No Stripe subscription found for this user" },
        { status: 404 },
      );
    }

    if (
      currentSubscription.status !== "active" &&
      currentSubscription.status !== "trialing"
    ) {
      return NextResponse.json(
        {
          message:
            "Only an active or trialing subscription can be canceled immediately",
        },
        { status: 400 },
      );
    }

    // Use a stable key so a retry cannot cancel the same Stripe subscription
    // more than once if the first response is lost in transit.
    const canceledSubscription = await STRIPE_CLIENT.subscriptions.cancel(
      currentSubscription.stripeSubscriptionId,
      undefined,
      { idempotencyKey: `subscription-cancel-immediately:${userId}:${currentSubscription.stripeSubscriptionId}` },
    );

    await db
      .update(subscription)
      .set({
        plan: "FREE",
        status: "canceled",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
        stripeCancelAtPeriodEnd: false,
      })
      .where(eq(subscription.userId, userId));

    return NextResponse.json(
      {
        message: "Subscription canceled immediately",
        data: {
          id: canceledSubscription.id,
          status: canceledSubscription.status,
          cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "[POST /api/stripe/subscriptions/cancel-immediately] Error:",
      error,
    );
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Something went wrong", error: message },
      { status: 500 },
    );
  }
}
