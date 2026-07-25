// import stripe from "stripe";
// import { envServer } from "../utils/envServer";

// const stripeClient = new stripe(envServer.STRIPE_SECRET_KEY);

// const STRIPE_PUBLISHABLE_KEY = envServer.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const STRIPE_PRICE_LIST = {
  pro: {
    id: "price_1TwWdtRYUVdsfWEPStBYxKeN",
    lookup_key: "pro-plan",
    currency: "INR",
    product_id: "prod_UwPSVhz4PG85hQ",
    type: "recurring",
    billing_scheme: "per_unit",
  },
  premium: {
    id: "price_1Tx4jURYUVdsfWEPbsnlijnI",
    lookup_key: "premium-plan",
    currency: "INR",
    product_id: "prod_UwPSVhz4PG85hQ",
    type: "recurring",
    billing_scheme: "per_unit",
  },
} as const;

const STRIPE_DEFAULT_PLAN_PRICE = "price_1TwWdtRYUVdsfWEPStBYxKeN";

const STRIPE_PRODUCT_ID = "prod_UwPSVhz4PG85hQ";

export {
  // stripeClient,
  // STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICE_LIST,
  STRIPE_DEFAULT_PLAN_PRICE,
  STRIPE_PRODUCT_ID,
};
