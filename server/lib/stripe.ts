import stripe from "stripe";
import { envServer } from "../utils/envServer";

export const stripeClient = new stripe(envServer.STRIPE_SECRET_KEY);

export const STRIPE_PUBLISHABLE_KEY =
  envServer.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export const STRIPE_PRICE_IDs = {
  premium: "price_1TGvgMFnaYPV7qjBZIU4TH4x",
} as const;
