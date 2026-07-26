import { NextResponse } from "next/server";
import { db } from "@/server/config/db.connect";
import { STRIPE_CLIENT } from "@/server/lib/stripe";
import { envServer } from "@/server/utils/envServer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, quantity = 1 } = body;

    if (!priceId) {
      return NextResponse.json(
        { message: "priceId is required" },
        { status: 400 },
      );
    }
    const session = await STRIPE_CLIENT.checkout.sessions.create({
      mode: "subscription", // or "payment" for one-time purchases
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: `${envServer.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${envServer.APP_URL}/checkout/cancel`,
    });

    return NextResponse.json(
      { message: "Checkout session created", data: { url: session.url } },
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
