// app/api/stripe/products/route.ts => /v1/products
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { envServer } from "@/server/utils/envServer";

const stripe = new Stripe(envServer.STRIPE_SECRET_KEY);

export async function GET() {
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Something went wrong", error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, metadata } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Product name is required" },
        { status: 400 },
      );
    }

    const product = await stripe.products.create({
      name,
      description,
      metadata,
    });

    return NextResponse.json(
      { message: "Product successfully created", data: product },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Something went wrong", error: message },
      { status: 500 },
    );
  }
}
