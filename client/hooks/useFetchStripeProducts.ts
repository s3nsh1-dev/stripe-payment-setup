import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const useFetchStripeProducts = () => {
  return useQuery({
    queryKey: ["stripe-product-list"],
    queryFn: async () => {
      const { data } = await axios.get("/api/stripe/products");
      return data;
    },
    enabled: false,
  });
};

export { useFetchStripeProducts };
