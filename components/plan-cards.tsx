"use client";
import type { FC } from "react";
import type {
  SubscriptionPlanType,
  AvailablePlansType,
} from "@/types/clientSide.types";
import { STRIPE_PRICE_LIST } from "@/client/constants/stripeConstants";
import { useCreateCheckoutSession } from "@/client/hooks/useCreateCheckoutSession";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const PlanCards: FC<{ plan: SubscriptionPlanType }> = ({ plan }) => {
  const checkout = useCreateCheckoutSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleSubmission = async (name: AvailablePlansType) => {
    const planInfo = STRIPE_PRICE_LIST[name];
    window.alert(`You are trying to buy ${planInfo.lookup_key}`);
    if (name === "FREE") {
      window.location.assign("/dashboard");
      return;
    }

    try {
      checkout.mutate(
        { priceId: planInfo.price_id, quantity: 1 },
        {
          onSuccess: (res) => {
            const checkoutUrl = res?.data?.url;

            // New subscribers receive a Checkout Session URL and must enter
            // payment details on Stripe's hosted page.
            if (checkoutUrl) {
              window.location.assign(checkoutUrl);
              return;
            }

            // Existing subscribers are updated immediately and receive a
            // Subscription object instead of a redirect URL.
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
            window.alert(
              res?.message ?? "Your subscription was updated successfully.",
            );
            router.refresh();
          },
          onError: (data) => {
            console.error(data);
            window.alert("Unable to update your subscription.");
          },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(message);
    }
  };

  return (
    <div
      key={plan.name}
      className={`rounded-3xl border p-8 ${
        plan.highlighted
          ? "border-indigo-500 bg-indigo-500/5"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      {plan.highlighted && (
        <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold">
          Most Popular
        </span>
      )}

      <h3 className="mt-6 text-2xl font-bold">{plan.name}</h3>

      <p className="mt-4">
        <span className="text-5xl font-bold">{plan.price}</span>

        <span className="text-zinc-400"> / month</span>
      </p>

      <p className="mt-4 text-zinc-400">{plan.description}</p>

      <ul className="mt-8 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-zinc-300">
            <span className="text-emerald-400">✓</span>

            {feature}
          </li>
        ))}
      </ul>

      <button
        className={`mt-10 w-full rounded-xl py-3 font-medium transition ${
          plan.highlighted
            ? "bg-indigo-600 hover:bg-indigo-500"
            : "border border-zinc-700 hover:bg-zinc-800"
        }`}
        onClick={() => handleSubmission(plan.name)}
        disabled={checkout.isPending}
      >
        {plan.button}
      </button>
    </div>
  );
};

export { PlanCards };
