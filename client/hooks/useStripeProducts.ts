import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const useStripeProducts = () => {
  return useMutation({
    mutationKey: ["stripe-product-list"],
    mutationFn: async () => {
      const { data } = await axios.post("/api/stripe/products");
      return data;
    },
  });
};

export { useStripeProducts };
