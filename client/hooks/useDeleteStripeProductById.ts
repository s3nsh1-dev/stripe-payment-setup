import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

let productId = "";
const useDeleteStripeProductById = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["delete-product"],
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/api/stripe/products/${id}`);
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

export { useDeleteStripeProductById };
