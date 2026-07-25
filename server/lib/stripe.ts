import stripe from "stripe";
import { envServer } from "../utils/envServer";

const stripeClient = new stripe(envServer.STRIPE_SECRET_KEY);

const STRIPE_PUBLISHABLE_KEY = envServer.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const STRIPE_PRICE_IDs = {
  pro: "price_1TwWmsRabGesf08JBf9D3Y0a",
  premium: "price_1TwWfjRabGesf08JvUGGecUl",
} as const;

export { stripeClient, STRIPE_PUBLISHABLE_KEY, STRIPE_PRICE_IDs };
