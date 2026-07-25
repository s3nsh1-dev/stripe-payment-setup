// app/api/stripe/plan/route.ts => /v1/plans
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { envServer } from "@/server/utils/envServer";

const stripe = new Stripe(envServer.STRIPE_SECRET_KEY);

export async function GET() {
  try {
    const plans = await stripe.plans.list({
      limit: 10,
    });
    return NextResponse.json(
      {
        message: "Plans successfully fetched",
        data: plans,
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
