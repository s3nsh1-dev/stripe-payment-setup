import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const useCancelStripeSubscription = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/stripe/subscriptions/cancel");
      return data;
    },
  });
};

export { useCancelStripeSubscription };
