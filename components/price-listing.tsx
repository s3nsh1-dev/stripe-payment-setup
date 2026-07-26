import { plans, pricingTiers } from "@/client/constants/commonConstant";
import { PlanCards } from "./plan-cards";

const PriceListing = () => {
  const renderPlansCard = plans.map((plan) => (
    <PlanCards key={plan.name} plan={plan} />
  ));

  return (
    <main className="min-h-screen bg-zinc-950 text-white ">
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-9">
        <div className="text-center">
          <h2 className="text-4xl font-bold">Choose Your Plan</h2>
          <p className="mt-3 text-zinc-400">
            Start for free and upgrade whenever you are ready.
          </p>
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-3">{renderPlansCard}</div>
      </section>
    </main>
  );
};

export default PriceListing;
