import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

let productId = "";
const useUpdateStripeProductById = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-product"],
    mutationFn: async ({ id, ...payload }: UpdateProductPayload) => {
      const { data } = await axios.post(`/api/stripe/products/${id}`, payload);
      productId = id;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stripe-products", productId],
      });
    },
  });
};

export { useUpdateStripeProductById };

interface UpdateProductPayload {
  id: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}
