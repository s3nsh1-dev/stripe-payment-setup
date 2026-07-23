import Link from "next/link";
import { plans } from "@/client/constants/commonConstant";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white ">
      {/* Pricing */}

      <section className="mx-auto max-w-7xl px-6 pb-24 pt-9">
        <div className="text-center">
          <h2 className="text-4xl font-bold">Choose Your Plan</h2>

          <p className="mt-3 text-zinc-400">
            Start for free and upgrade whenever you are ready.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
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
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-zinc-300"
                  >
                    <span className="text-emerald-400">✓</span>

                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={plan.redirect}>
                <button
                  className={`mt-10 w-full rounded-xl py-3 font-medium transition ${
                    plan.highlighted
                      ? "bg-indigo-600 hover:bg-indigo-500"
                      : "border border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  {plan.button}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
