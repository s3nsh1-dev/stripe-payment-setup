// app/checkout/success/page.tsx

import { useFetchStripeSession } from "@/client/hooks/useFetchStripeSession";
import { use, type FC } from "react";

const CheckoutPendingPage: FC<PropType> = ({ params }) => {
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

  return (
    <div>Transaction in progress, Please wait for sometime: {session_id}</div>
  );
};

export default CheckoutPendingPage;

type PropType = {
  params: Promise<{ session_id?: string }>;
};
