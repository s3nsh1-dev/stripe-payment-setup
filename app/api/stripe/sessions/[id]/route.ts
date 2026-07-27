import { NextResponse } from "next/server";
import { STRIPE_CLIENT } from "@/server/lib/stripe";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Session id is required" },
        { status: 400 },
      );
    }

    const session = await STRIPE_CLIENT.checkout.sessions.retrieve(id);
    return NextResponse.json(
      {
        message: "Session successfully fetched",
        data: session,
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
