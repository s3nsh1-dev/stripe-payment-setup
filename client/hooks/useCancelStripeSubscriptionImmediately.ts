import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const useCancelStripeSubscriptionImmediately = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        "/api/stripe/subscriptions/cancel-immediately",
      );
      return data;
    },
  });
};

export { useCancelStripeSubscriptionImmediately };
