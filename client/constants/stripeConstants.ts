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

const STRIPE_DEFAULT_PLAN_PRICE = "price_1TwWdtRYUVdsfWEPStBYxKeN";

const STRIPE_PRODUCT_ID = "prod_UwPSVhz4PG85hQ";

export { STRIPE_PRICE_LIST, STRIPE_DEFAULT_PLAN_PRICE, STRIPE_PRODUCT_ID };
