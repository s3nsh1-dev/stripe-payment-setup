// app/api/stripe/products/route.ts => /v1/products
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { envServer } from "@/server/utils/envServer";

const stripe = new Stripe(envServer.STRIPE_SECRET_KEY);

export async function POST() {
  try {
    const products = await stripe.products.list({
      limit: 10,
    });
    return NextResponse.json(
      {
        message: "Product successfully fetched",
        data: products,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong", data: error },
      { status: 500 },
    );
  }
}
