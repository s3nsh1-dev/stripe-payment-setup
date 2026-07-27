"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCancelStripeSubscription } from "@/client/hooks/useCancelStripeSubscription";

const CancelSubscriptionButton = () => {
  const cancelSubscription = useCancelStripeSubscription();
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleCancel = () => {
    const confirmed = window.confirm(
      "Cancel this subscription at the end of the current billing period?",
    );

    if (!confirmed) {
      return;
    }

    cancelSubscription.mutate(undefined, {
      onSuccess: (response) => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        window.alert(
          response?.message ?? "Your subscription cancellation was scheduled.",
        );
        router.refresh();
      },
      onError: (error) => {
        console.error("Subscription cancellation failed:", error);
        window.alert("Unable to cancel your subscription.");
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={cancelSubscription.isPending}
      className="rounded-xl border border-rose-500/50 px-5 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cancelSubscription.isPending
        ? "Scheduling cancellation..."
        : "Cancel subscription"}
    </button>
  );
};

export { CancelSubscriptionButton };
