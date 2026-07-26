// This is used to check weather the session after checkout is valid or not

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const useFetchStripeSession = ({ id }: { id?: string }) => {
  return useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/stripe/sessions/${id}`);
      return data;
    },
    enabled: !!id,
  });
};
export { useFetchStripeSession };
