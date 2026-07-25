import axios from "axios";
import { useMutation } from "@tanstack/react-query";

const useStripePlans = () => {
  return useMutation({
    mutationKey: ["stripe-plan-list"],
    mutationFn: async () => {
      const { data } = await axios.post("/api/stripe/plans");
      return data;
    },
  });
};

export { useStripePlans };
