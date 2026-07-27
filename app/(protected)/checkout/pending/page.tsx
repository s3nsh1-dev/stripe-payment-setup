// app/checkout/success/page.tsx
"use client";
import { useFetchStripeSession } from "@/client/hooks/useFetchStripeSession";
import { use, type FC } from "react";

const CheckoutPendingPage: FC<PropType> = ({ searchParams }) => {
  const { session_id } = use(searchParams);
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
  if (validateSession.data?.payment_status === "unpaid") {
    return (
      <div>
        There is some issue regarding you payment, please contact to helpdesk if
        not resolved soon.
      </div>
    );
  }

  return (
    <div>Transaction in progress, Please wait for sometime: {session_id}</div>
  );
};

export default CheckoutPendingPage;

type PropType = {
  searchParams: Promise<{ session_id?: string }>;
};
