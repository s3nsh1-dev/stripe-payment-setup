import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { STRIPE_PRODUCT_ID } from "@/client/constants/stripeConstants";

const useFetchStripeProductById = () => {
  return useQuery({
    queryKey: [STRIPE_PRODUCT_ID, "stripe-product-id"],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/stripe/products/${STRIPE_PRODUCT_ID}`,
      );
      return data;
    },
    enabled: false,
  });
};

export { useFetchStripeProductById };
