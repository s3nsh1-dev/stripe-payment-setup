"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCancelStripeSubscriptionImmediately } from "@/client/hooks/useCancelStripeSubscriptionImmediately";

const CancelSubscriptionImmediatelyButton = () => {
  const cancelSubscription = useCancelStripeSubscriptionImmediately();
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleCancelImmediately = () => {
    const confirmed = window.confirm(
      "Cancel this subscription immediately? Access may end now and this action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    cancelSubscription.mutate(undefined, {
      onSuccess: (response) => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        window.alert(
          response?.message ?? "Your subscription was canceled immediately.",
        );
        router.refresh();
      },
      onError: (error) => {
        console.error("Immediate subscription cancellation failed:", error);
        window.alert("Unable to cancel your subscription immediately.");
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleCancelImmediately}
      disabled={cancelSubscription.isPending}
      className="rounded-xl border border-red-500/60 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cancelSubscription.isPending
        ? "Canceling immediately..."
        : "Cancel immediately"}
    </button>
  );
};

export { CancelSubscriptionImmediatelyButton };
