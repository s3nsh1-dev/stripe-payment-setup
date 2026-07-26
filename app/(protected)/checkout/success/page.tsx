"use client";
import { useFetchStripeSession } from "@/client/hooks/useFetchStripeSession";
import { use, type FC } from "react";
import { PRICE_TO_TIER } from "@/client/constants/stripeConstants";
import Link from "next/link";

const CheckoutSuccessPage: FC<PropType> = ({ searchParams }) => {
  const { session_id } = use(searchParams);
  const { data, isLoading, isError } = useFetchStripeSession({
    id: session_id || "",
  });

  const content = () => {
    if (!session_id) {
      return (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-center text-rose-100">
          <p className="text-lg font-semibold">Invalid session</p>
          <p className="mt-2 text-sm text-rose-200/80">
            Please try again from the checkout flow.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="rounded-3xl border border-slate-600/50 bg-slate-800/80 p-8 text-center text-slate-200">
          <p className="text-lg font-semibold">Loading payment details...</p>
          <p className="mt-2 text-sm text-slate-400">
            Checking your Stripe session now.
          </p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-center text-amber-100">
          <p className="text-lg font-semibold">Unable to verify payment</p>
          <p className="mt-2 text-sm text-amber-200/80">
            Something went wrong while checking your payment status.
          </p>
        </div>
      );
    }

    if (data.data?.payment_status === "paid") {
      return (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center text-emerald-100">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            Subscription Confirmed
          </h1>
          <p className="mt-3 text-sm leading-6 text-emerald-100/90">
            You are subscribed! Welcome to{" "}
            {PRICE_TO_TIER[data.data?.metadata?.priceId]}.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Dashboard
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-slate-600/50 bg-slate-800/80 p-8 text-center text-slate-200">
        <p className="text-lg font-semibold">Payment not completed yet</p>
        <p className="mt-2 text-sm text-slate-400">
          If you just returned from Stripe, the status might still be
          processing.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-2xl rounded-4xl border border-slate-700/80 bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/20">
        {content()}
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;

type PropType = {
  searchParams: Promise<{ session_id?: string }>;
};
