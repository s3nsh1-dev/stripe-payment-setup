// app/api/stripe/products/[id]/route.ts => /v1/products/prod_UwPSVhz4PG85hQ

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { envServer } from "@/server/utils/envServer";

const stripe = new Stripe(envServer.STRIPE_SECRET_KEY);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const specificProduct = await stripe.products.retrieve(id);
    return NextResponse.json(
      {
        message: "Product successfully fetched",
        data: specificProduct,
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
