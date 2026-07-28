import Link from "next/link";
import { eq } from "drizzle-orm";
import { plans } from "@/client/constants/commonConstant";
import { CancelSubscriptionButton } from "@/components/cancel-subscription-button";
import { CancelSubscriptionImmediatelyButton } from "@/components/cancel-subscription-immediately-button";
import { PlanCards } from "@/components/plan-cards";
import { db } from "@/server/config/db.connect";
import { requireAuth } from "@/server/lib/auth-guard";
import { subscription } from "@/server/schema";

const SubscriptionPage = async () => {
  const session = await requireAuth();
  const rows = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, session.user.id));
  const currentSubscription = rows[0];
  const currentPlan = currentSubscription?.plan ?? "FREE";
  const targetPlan =
    currentSubscription?.status === "active" &&
    !currentSubscription?.stripeCancelAtPeriodEnd &&
    currentPlan === "PRO"
      ? "PREMIUM"
      : currentSubscription?.status === "active" &&
          !currentSubscription?.stripeCancelAtPeriodEnd &&
          currentPlan === "PREMIUM"
        ? "PRO"
        : null;
  const targetPlanInfo = targetPlan
    ? plans.find((plan) => plan.name === targetPlan)
    : undefined;
  const canCancel =
    (currentSubscription?.status === "active" ||
      currentSubscription?.status === "trialing") &&
    Boolean(currentSubscription?.stripeSubscriptionId) &&
    !currentSubscription?.stripeCancelAtPeriodEnd;
  const canCancelImmediately =
    (currentSubscription?.status === "active" ||
      currentSubscription?.status === "trialing") &&
    Boolean(currentSubscription?.stripeSubscriptionId);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <section>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">
            Billing
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Subscription
          </h1>
          <p className="mt-2 text-zinc-400">
            View your current subscription and change plans without creating a
            second subscription.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Current plan</p>
              <h2 className="mt-2 text-3xl font-semibold">{currentPlan}</h2>
            </div>
            <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium capitalize text-emerald-400">
              {currentSubscription?.status ?? "not subscribed"}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="Subscription ID"
              value={currentSubscription?.stripeSubscriptionId ?? "Not available"}
            />
            <InfoItem
              label="Stripe price ID"
              value={currentSubscription?.stripePriceId ?? "Not available"}
            />
            <InfoItem
              label="Current period ends"
              value={formatDate(currentSubscription?.stripeCurrentPeriodEnd)}
            />
            <InfoItem
              label="Cancel at period end"
              value={currentSubscription?.stripeCancelAtPeriodEnd ? "Yes" : "No"}
            />
          </div>

          {canCancel && (
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-rose-200">
                  Cancel this subscription
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  You will keep access until the current billing period ends.
                  Stripe will not renew the subscription after that date.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <CancelSubscriptionButton />
                <CancelSubscriptionImmediatelyButton />
              </div>
            </div>
          )}

          {currentSubscription?.stripeCancelAtPeriodEnd && (
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Cancellation is scheduled for the end of the current billing
                period: {formatDate(currentSubscription.stripeCurrentPeriodEnd)}.
                Your access remains active until then.
              </p>
              {canCancelImmediately && (
                <CancelSubscriptionImmediatelyButton />
              )}
            </div>
          )}
        </section>

        {targetPlanInfo ? (
          <section>
            <h2 className="text-2xl font-semibold">
              {currentPlan === "PRO"
                ? "Upgrade to PREMIUM"
                : "Downgrade to PRO"}
            </h2>
            <p className="mt-2 text-zinc-400">
              Your existing Stripe subscription will be changed in place. No
              second checkout or duplicate subscription will be created.
            </p>
            <div className="mt-6 max-w-xl">
              <PlanCards
                plan={{
                  ...targetPlanInfo,
                  button:
                    currentPlan === "PRO"
                      ? "Upgrade to PREMIUM"
                      : "Downgrade to PRO",
                }}
              />
            </div>
          </section>
        ) : currentSubscription?.stripeCancelAtPeriodEnd ? (
          <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8">
            <h2 className="text-2xl font-semibold text-amber-100">
              Subscription ending soon
            </h2>
            <p className="mt-2 text-zinc-400">
              Your current plan remains available until the billing period ends.
              Plan changes are disabled while cancellation is scheduled.
            </p>
          </section>
        ) : (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="text-2xl font-semibold">No active subscription</h2>
            <p className="mt-2 text-zinc-400">
              Choose a paid plan to start a new Stripe Checkout Session.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-medium transition hover:bg-indigo-500"
            >
              View plans
            </Link>
          </section>
        )}
      </div>
    </main>
  );
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleString() : "Not available";
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 break-all font-mono text-sm text-zinc-200">{value}</p>
    </div>
  );
}

export default SubscriptionPage;
