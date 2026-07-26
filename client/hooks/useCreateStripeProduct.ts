import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const useCreateStripeProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["create-product"],
    mutationFn: async (payload: CreateProductPayload) => {
      const { data } = await axios.post(`/api/stripe/products`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-products"] });
    },
  });
};

export { useCreateStripeProduct };

interface CreateProductPayload {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
  // ...
}
