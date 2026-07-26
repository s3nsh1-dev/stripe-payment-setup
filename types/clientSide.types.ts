export type SubscriptionPlanType = {
  name: AvailablePlansType;
  price: string;
  description: string;
  features: string[];
  button: string;
  highlighted: boolean;
  redirect: string;
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
export type AvailablePlansType = "FREE" | "PRO" | "PREMIUM";
export type StripePriceListType = Record<AvailablePlansType, StripePriceConfig>;
