import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const useStripePricing = () => {
  return useQuery({
    queryKey: ["stripePricing"],
    queryFn: async () => {
      const { data } = await axios.get("/api/stripe/prices");
      return data;
    },
    enabled: false,
  });
};

export { useStripePricing };
