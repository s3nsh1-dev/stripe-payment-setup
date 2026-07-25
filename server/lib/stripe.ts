import stripe from "stripe";
import { envServer } from "../utils/envServer";

const stripeClient = new stripe(envServer.STRIPE_SECRET_KEY);

const STRIPE_PUBLISHABLE_KEY = envServer.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export { stripeClient, STRIPE_PUBLISHABLE_KEY };
