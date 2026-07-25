"use client";
import { useStripePricing } from "@/client/hooks/useStripePricing";

const ApiButtons = () => {
  const fetch = useStripePricing();

  const handleFetchPrice = async () => {
    const result = await fetch.refetch();
    console.log("Stripe fetch data:", result.data);
  };
  const handleBuyPro = () => {};
  const handleBuyPremium = () => {};

  const baseButtonClass =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

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
        <button
          onClick={handleFetchPrice}
          disabled={fetch.isFetching}
          className={`${baseButtonClass} bg-sky-600 text-white hover:bg-sky-700`}
        >
          {fetch.isFetching ? "Fetching..." : "Fetch prices"}
        </button>

        <button
          onClick={handleBuyPro}
          className={`${baseButtonClass} bg-slate-900 text-white hover:bg-slate-800`}
        >
          Buy pro plan
        </button>

        <button
          onClick={handleBuyPremium}
          className={`${baseButtonClass} border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100`}
        >
          Buy premium plan
        </button>
      </div>
    </div>
  );
};

export default ApiButtons;
