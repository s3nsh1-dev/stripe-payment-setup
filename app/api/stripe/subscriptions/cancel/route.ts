import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/config/db.connect";
import { requireAuth } from "@/server/lib/auth-guard";
import { STRIPE_CLIENT } from "@/server/lib/stripe";
import { subscription } from "@/server/schema";

export async function POST() {
  try {
    const userSession = await requireAuth();
    const rows = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userSession.user.id));
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
        { message: "Only an active or trialing subscription can be canceled" },
        { status: 400 },
      );
    }

    if (currentSubscription.stripeCancelAtPeriodEnd) {
      return NextResponse.json(
        {
          message: "Subscription cancellation is already scheduled",
          data: {
            stripeSubscriptionId: currentSubscription.stripeSubscriptionId,
            cancelAt: currentSubscription.stripeCurrentPeriodEnd,
          },
        },
        { status: 200 },
      );
    }

    // Schedule cancellation instead of canceling immediately. The customer
    // keeps access until the period already paid for reaches its end.
    const updatedSubscription = await STRIPE_CLIENT.subscriptions.update(
      currentSubscription.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );
    const currentItem = updatedSubscription.items.data[0];

    await db
      .update(subscription)
      .set({
        status: updatedSubscription.status,
        stripeCancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        stripeCurrentPeriodEnd: currentItem
          ? new Date(currentItem.current_period_end * 1000)
          : currentSubscription.stripeCurrentPeriodEnd,
      })
      .where(eq(subscription.userId, userSession.user.id));

    return NextResponse.json(
      {
        message: "Subscription cancellation scheduled",
        data: updatedSubscription,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST /api/stripe/subscriptions/cancel] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Something went wrong", error: message },
      { status: 500 },
    );
  }
}
