// app/checkout/success/page.tsx
export default async function CheckoutPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    // handle missing session
  }

  // Optionally verify server-side by retrieving the session from Stripe
  // const session = await stripe.checkout.sessions.retrieve(session_id);

  return (
    <div>Transaction in progress, Please wait for sometime: {session_id}</div>
  );
}
