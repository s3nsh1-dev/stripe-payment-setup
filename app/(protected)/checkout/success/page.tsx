import { useFetchStripeSession } from "@/client/hooks/useFetchStripeSession";
import { use, type FC } from "react";

const CheckoutSuccessPage: FC<PropType> = ({ params }) => {
  const { session_id } = use(params);
  const validateSession = useFetchStripeSession({ id: session_id || "" });

  if (!session_id) {
    return <div>Invalid session</div>;
  }

  if (validateSession.isLoading) {
    return <div>Loading...</div>;
  }

  if (validateSession.isError) {
    return <div>Unable to verify payment.</div>;
  }

  if (validateSession.data?.payment_status === "paid") {
    return <div>🎉 You are subscribed! Welcome to Pro.</div>;
  }

  return <div>Payment not completed yet.</div>;
};

export default CheckoutSuccessPage;

type PropType = {
  params: Promise<{ session_id?: string }>;
};
