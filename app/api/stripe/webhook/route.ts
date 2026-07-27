// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { STRIPE_CLIENT } from "@/server/lib/stripe";
import { envServer } from "@/server/utils/envServer";
import { db } from "@/server/config/db.connect";
import { subscription } from "@/server/schema";
import { eq } from "drizzle-orm";
import { PRICE_TO_TIER } from "@/client/constants/stripeConstants";

export async function POST(request: Request) {
  // 1. Raw body — required for signature verification, do NOT use request.json() here
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  // 2. Verify this request genuinely came from Stripe
  let event: Stripe.Event;
  try {
    event = STRIPE_CLIENT.webhooks.constructEvent(
      rawBody,
      signature,
      envServer.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  // 3. Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // metadata is reliable here — this is the one event where we set it ourselves
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) {
          console.error(
            "Missing userId or subscriptionId in checkout session",
            session.id,
          );
          break;
        }

        // session alone doesn't include period end / status — fetch full subscription
        const stripeSubscription =
          await STRIPE_CLIENT.subscriptions.retrieve(subscriptionId);
        const priceId = stripeSubscription.items.data[0]?.price.id;

        await db
          .update(subscription)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: priceId,
            status: stripeSubscription.status,
            stripeCurrentPeriodEnd: new Date(
              stripeSubscription.items.data[0].current_period_end * 1000,
            ),
            stripeCancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            plan: PRICE_TO_TIER[priceId], // PRO || PREMIUM
          })
          .where(eq(subscription.userId, userId));

        // non-critical — fire and forget, don't block the response
        // sendWelcomeEmail(session.customer_details?.email).catch((e) => console.error(e));

        break;
      }

      case "customer.subscription.updated": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const customerId = stripeSubscription.customer as string;
        const priceId = stripeSubscription.items.data[0]?.price.id;

        await db
          .update(subscription)
          .set({
            plan: PRICE_TO_TIER[priceId],
            stripePriceId: priceId,
            status: stripeSubscription.status,
            stripeCurrentPeriodEnd: new Date(
              stripeSubscription.items.data[0].current_period_end * 1000,
            ),
            stripeCancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          })
          .where(eq(subscription.stripeCustomerId, customerId));

        break;
      }

      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const customerId = stripeSubscription.customer as string;

        await db
          .update(subscription)
          .set({
            plan: "FREE",
            status: "canceled",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
            stripeCancelAtPeriodEnd: false,
            // stripeCustomerId intentionally kept — reuse same Stripe customer next time
          })
          .where(eq(subscription.stripeCustomerId, customerId));

        break;
      }

      default:
        // unrecognized/unhandled event — acknowledge so Stripe doesn't retry needlessly
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook handler error:", message);
    // returning 500 here tells Stripe to retry this event later
    return NextResponse.json(
      { message: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
