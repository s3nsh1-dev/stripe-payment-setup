"use client";
import { useStripePricing } from "@/client/hooks/useStripePricing";
import { useStripeProducts } from "@/client/hooks/useStripeProducts";
import { useStripePlans } from "@/client/hooks/useStripePlans";

const ApiButtons = () => {
  const priceFetch = useStripePricing();
  const productFetch = useStripeProducts();
  const planFetch = useStripePlans();

  const handleFetchPrice = async () => {
    priceFetch.mutate(undefined, {
      onSuccess: (data) => {
        console.log("Stripe priceFetch data:", data);
      },
    });
  };
  const handleFetchProducts = async () => {
    productFetch.mutate(undefined, {
      onSuccess: (data) => {
        console.log("Stripe productFetch data:", data);
      },
    });
  };
  const handleFetchPlans = () => {
    planFetch.mutate(undefined, {
      onSuccess: (data) => {
        console.log("Stripe planFetch data:", data);
      },
    });
  };
  const btnInfo = [
    {
      id: 1,
      text: priceFetch.isPending ? "Fetching..." : "Price",
      action: handleFetchPrice,
      disabled: priceFetch.isPending,
    },
    {
      id: 2,
      text: productFetch.isPending ? "Fetching..." : "Products",
      action: handleFetchProducts,
      disabled: productFetch.isPending,
    },
    {
      id: 3,
      text: priceFetch.isPending ? "Fetching..." : "Plan",
      action: handleFetchPlans,
      disabled: priceFetch.isPending,
    },
  ];

  const renderButtons = btnInfo.map((btn) => {
    return (
      <button
        key={btn.id}
        onClick={btn.action}
        disabled={btn.disabled}
        className={`${baseButtonClass} bg-slate-900 text-white hover:bg-slate-800`}
      >
        {btn.text}
      </button>
    );
  });

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Stripe plans
          </h2>
          <p className="text-sm text-slate-500">
            Browse pricing and choose a plan.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {renderButtons}
      </div>
    </div>
  );
};

export default ApiButtons;

const baseButtonClass =
  "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
