import Stripe from "stripe";
import { envServer } from "../utils/envServer";

const STRIPE_CLIENT = new Stripe(envServer.STRIPE_SECRET_KEY);

export { STRIPE_CLIENT };
