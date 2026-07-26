import type { StripePriceListType } from "@/types/clientSide.types";

const STRIPE_PRICE_LIST: StripePriceListType = {
  FREE: {
    price_id: "no-price-for-free-tier",
    lookup_key: "free-plan",
    currency: "INR",
    product_id: "prod_UwPSVhz4PG85hQ",
    type: "recurring",
    billing_scheme: "per_unit",
  },
  PRO: {
    price_id: "price_1TwWdtRYUVdsfWEPStBYxKeN",
    lookup_key: "pro-plan",
    currency: "INR",
    product_id: "prod_UwPSVhz4PG85hQ",
    type: "recurring",
    billing_scheme: "per_unit",
  },
  PREMIUM: {
    price_id: "price_1Tx4jURYUVdsfWEPbsnlijnI",
    lookup_key: "premium-plan",
    currency: "INR",
    product_id: "prod_UwPSVhz4PG85hQ",
    type: "recurring",
    billing_scheme: "per_unit",
  },
} as const;

const ALLOWED_PRICE_IDS = new Set([
  "price_1TwWdtRYUVdsfWEPStBYxKeN",
  "price_1Tx4jURYUVdsfWEPbsnlijnI",
]);

const PRICE_TO_TIER: Record<string, "PRO" | "PREMIUM"> = {
  price_1TwWdtRYUVdsfWEPStBYxKeN: "PRO",
  price_1Tx4jURYUVdsfWEPbsnlijnI: "PREMIUM",
};

const STRIPE_PRODUCT_ID = "prod_UwPSVhz4PG85hQ";

const STRIPE_SAMPLE_SESSION_ID =
  "cs_test_a1Z6MfjMuE1sI6XrFChfb8YrNUVo5e7Nj9DuWIX5VG93E4oszmZ7qmtyf3";

export {
  STRIPE_PRICE_LIST,
  ALLOWED_PRICE_IDS,
  PRICE_TO_TIER,
  STRIPE_PRODUCT_ID,
  STRIPE_SAMPLE_SESSION_ID,
};
