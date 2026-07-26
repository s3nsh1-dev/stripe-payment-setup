export type SubscriptionPlanType = {
  name: AvailablePlansType;
  price: string;
  description: string;
  features: string[];
  button: string;
  highlighted: boolean;
  redirect: string;
};

export type PricingTierType = {
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
  price_id: string;
  lookup_key: string;
  currency: string;
  product_id: string;
  type: "recurring" | "one_time";
  billing_scheme: "per_unit" | "tiered";
};

export type Plans = SubscriptionPlanType[];
export type PricingTiers = PricingTierType[];
export type AvailablePlansType = "free" | "pro" | "premium";
export type StripePriceListType = Record<AvailablePlansType, StripePriceConfig>;
