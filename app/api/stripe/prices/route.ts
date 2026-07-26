// app/api/stripe/prices/route.ts => /v1/prices
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { envServer } from "@/server/utils/envServer";

const stripe = new Stripe(envServer.STRIPE_SECRET_KEY);

export async function GET() {
  try {
    const prices = await stripe.prices.list({
      limit: 10,
      expand: ["data.product"], // optional: includes full product object, not just its ID
    });
    return NextResponse.json(
      {
        message: "Prices successfully fetched",
        data: prices,
      },
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
