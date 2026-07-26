import { NextResponse } from "next/server";
import { db } from "@/server/config/db.connect";
import { STRIPE_CLIENT } from "@/server/lib/stripe";
import { envServer } from "@/server/utils/envServer";
import { requireAuth } from "@/server/lib/auth-guard";
import { user } from "@/server/schema";
import { eq } from "drizzle-orm";

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
        { status: 404 },
      );
    }

    // do we session user is actually in the db or not ?
    const userId = userSession.user.id;
    const checkUser = await db.select().from(user).where(eq(user.id, userId));
    if (!checkUser[0].id) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // check if the user is a customer or not ?
    let customerId = checkUser[0].stripeCustomerId;
    if (!customerId) {
      try {
        const createCustomer = await STRIPE_CLIENT.customers.create({
          email: checkUser[0].email,
          metadata: {
            userId: checkUser[0].id,
            username: checkUser[0].name,
            userImage: checkUser[0].image,
          },
        });
        customerId = createCustomer.id;

        await db
          .update(user)
          .set({ stripeCustomerId: createCustomer.id })
          .where(eq(user.id, checkUser[0].id));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "UNEXPECTED ERROR WHILE SETTING CUSTOMER";
        return NextResponse.json({ message }, { status: 500 });
      }
    }

    const session = await STRIPE_CLIENT.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: "subscription", // or "payment" for one-time purchases
      success_url: `${envServer.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${envServer.APP_URL}/checkout/cancel`,
      metadata: {
        userId: userId,
        customerId: customerId,
        priceId: priceId,
      },
    });

    return NextResponse.json(
      { message: "Checkout session created", data: session },
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

/**
 * user request for checkout for a plan with priceId
 * i take this plan and send request to stripe for checkout
 * if checkout is successful then i update the user table with stripe related info which is null by default (free tier)
 * i response back with url ?
 */
