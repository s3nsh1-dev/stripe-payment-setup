import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const useFetchStripePlans = () => {
  return useQuery({
    queryKey: ["stripe-plan-list"],
    queryFn: async () => {
      const { data } = await axios.get("/api/stripe/plans");
      return data;
    },
    enabled: false,
  });
};

export { useFetchStripePlans };
