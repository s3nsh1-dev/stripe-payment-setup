"use client";
import { useFetchStripePrices } from "@/client/hooks/useFetchStripePrices";
import { useFetchStripeProducts } from "@/client/hooks/useFetchStripeProducts";
import { useFetchStripePlans } from "@/client/hooks/useFetchStripePlans";
import { useFetchStripeProductById } from "@/client/hooks/useFetchStripeProductById";
import { useFetchStripeSession } from "@/client/hooks/useFetchStripeSession";

const ApiButtons = () => {
  const priceFetch = useFetchStripePrices();
  const productFetch = useFetchStripeProducts();
  const planFetch = useFetchStripePlans();
  const productByIdFetch = useFetchStripeProductById();
  const sessionByIdFetch = useFetchStripeSession({
    id: "cs_test_a1Z6MfjMuE1sI6XrFChfb8YrNUVo5e7Nj9DuWIX5VG93E4oszmZ7qmtyf3",
  });

  const handleFetchPrice = async () => {
    const data = await priceFetch.refetch();
    console.log("PRICES:", data);
  };
  const handleFetchProducts = async () => {
    const data = await productFetch.refetch();
    console.log("PRODUCTS:", data);
  };
  const handleFetchPlans = async () => {
    const data = await planFetch.refetch();
    console.log("PLANS:", data);
  };

  const handleFetchProductById = async () => {
    const data = await productByIdFetch.refetch();
    console.log("PRODUCT BY ID:", data);
  };

  const handleFetchSessionById = async () => {
    const result = await sessionByIdFetch.refetch();

    if (result.error) {
      console.error("SESSION BY ID ERROR:", result.error);
      return;
    }

    // The API returns { message, data }, so the Stripe Checkout Session is
    // in result.data.data rather than result.data itself.
    console.log("SESSION BY ID:", result.data?.data);
  };

  const btnInfo = [
    {
      id: 1,
      text: priceFetch.isFetching ? "Fetching..." : "Price",
      action: handleFetchPrice,
      disabled: priceFetch.isFetching,
    },
    {
      id: 2,
      text: productFetch.isFetching ? "Fetching..." : "Products",
      action: handleFetchProducts,
      disabled: productFetch.isFetching,
    },
    {
      id: 3,
      text: planFetch.isFetching ? "Fetching..." : "Plan",
      action: handleFetchPlans,
      disabled: planFetch.isFetching,
    },
    {
      id: 4,
      text: productByIdFetch.isFetching ? "Fetching..." : "Product By Id",
      action: handleFetchProductById,
      disabled: productByIdFetch.isFetching,
    },
    {
      id: 5,
      text: sessionByIdFetch.isFetching ? "Fetching..." : "Session By Id",
      action: handleFetchSessionById,
      disabled: sessionByIdFetch.isFetching,
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
