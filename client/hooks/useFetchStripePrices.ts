import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const useFetchStripePrices = () => {
  return useQuery({
    queryKey: ["stripe-price-list"],
    queryFn: async () => {
      const { data } = await axios.get("/api/stripe/prices");
      return data;
    },
    enabled: false,
  });
};

export { useFetchStripePrices };
