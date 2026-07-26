import { NextResponse } from "next/server";
import { db } from "@/server/config/db.connect";
import { STRIPE_CLIENT } from "@/server/lib/stripe";
import { envServer } from "@/server/utils/envServer";
import { requireAuth } from "@/server/lib/auth-guard";
import { user, subscription } from "@/server/schema";
import { eq } from "drizzle-orm";
import { ALLOWED_PRICE_IDS } from "@/client/constants/stripeConstants";

export async function POST(request: Request) {
  try {
    // check is request is by valid user or not
    const userSession = await requireAuth();
    if (!userSession) {
      return NextResponse.json(
        { message: "UNAUTHENTICATED REQUEST" },
        { status: 401 },
      );
    }

    // do we have price_id or not
    const body = await request.json();
    const { priceId, quantity = 1 } = body;

    if (!priceId) {
      return NextResponse.json(
        { message: "price_id not found" },
        { status: 400 },
      );
    }
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      return NextResponse.json({ message: "Invalid priceId" }, { status: 400 });
    }

    const userId = userSession.user.id;

    const customerId = await db.transaction(async (tx) => {
      // lock the subscription row for this user, if it exists
      const subRows = await tx
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId))
        .for("update");

      const existingSub = subRows[0];

      // already has a Stripe customer — reuse it, nothing else to do
      if (existingSub?.stripeCustomerId) {
        return existingSub.stripeCustomerId;
      }

      // need user's email/name to create the Stripe customer
      const userRows = await tx.select().from(user).where(eq(user.id, userId));
      const existingUser = userRows[0];

      if (!existingUser) {
        throw new Error("User not found");
      }

      const createCustomer = await STRIPE_CLIENT.customers.create({
        email: existingUser.email,
        metadata: {
          userId: existingUser.id,
          username: existingUser.name,
        },
      });

      if (existingSub) {
        // subscription row exists (e.g. FREE plan) but has no customerId yet
        await tx
          .update(subscription)
          .set({ stripeCustomerId: createCustomer.id })
          .where(eq(subscription.userId, userId));
      } else {
        // no subscription row at all yet — create one
        await tx.insert(subscription).values({
          id: crypto.randomUUID(),
          userId,
          stripeCustomerId: createCustomer.id,
          plan: "FREE",
        });
      }

      return createCustomer.id;
    });

    const checkoutSession = await STRIPE_CLIENT.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: "subscription",
      success_url: `${envServer.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${envServer.APP_URL}/checkout/cancel`,
      metadata: {
        userId,
        customerId,
        priceId,
      },
    });

    return NextResponse.json(
      { message: "Checkout session created", data: checkoutSession },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Something went wrong", error: message },
      { status: 500 },
    );
  }
}
