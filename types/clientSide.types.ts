export type SubscriptionPlanType = {
  name: "free" | "pro" | "premium";
  price: string;
  description: string;
  features: string[];
  button: string;
  highlighted: boolean;
  redirect: string;
};

export type PricingTier = {
  id: string;
  name: string;
  price: number;
  priceId: string | null;
  currency: string;
  interval: string;
  features: string[];
  isPopular: boolean;
};

export type StripePriceConfig = {
  id: string;
  lookup_key: string;
  currency: string;
  product_id: string;
  type: "recurring" | "one_time";
  billing_scheme: "per_unit" | "tiered";
};

export type StripePriceList = Record<string, StripePriceConfig>;

export type Plans = SubscriptionPlanType[];
export type PricingTiers = PricingTier[];
