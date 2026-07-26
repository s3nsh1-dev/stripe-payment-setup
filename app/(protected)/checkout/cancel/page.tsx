// app/checkout/success/page.tsx
export default async function CheckoutCancelPage({
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
    <div>
      Your Request for Subscription has been canceled for this session
      {session_id && <p> - {session_id}</p>}
      <p>Tell us why ? we will work it.</p>
    </div>
  );
}
