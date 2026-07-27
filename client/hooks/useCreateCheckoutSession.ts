import { useMutation } from "@tanstack/react-query";
import axios from "axios";

interface CreateCheckoutPayload {
  priceId: string;
  quantity?: number;
}

const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: async (payload: CreateCheckoutPayload) => {
      try {
        const { data } = await axios.post(`/api/stripe/checkouts`, payload);
        return data;
      } catch (error) {
        throw error;
      }
    },
  });
};

export { useCreateCheckoutSession };
