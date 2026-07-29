# Local Active Billing Fields — Explanation and Guidance

This document explains the "local active billing fields" found in the codebase, why they exist, where they live, how they get updated, how the app uses them, and recommended best practices and testing tips.

**Short summary**

- "Local active billing fields" are the columns in the local `subscription` table that represent a user's current billing/subscription state (e.g., plan, Stripe IDs, status, period end). They are authoritative for application logic and UI, and are maintained by server code and Stripe webhooks.

**Fields discovered**
Found in the `subscription` table schema ([server/schema/auth-schema.ts](server/schema/auth-schema.ts)):

- `plan` — enum (`FREE`, `PRO`, `PREMIUM`). The app-level tier computed from Stripe price IDs.
- `status` — Stripe subscription status (e.g., `active`, `trialing`, `canceled`, `past_due`).
- `stripeCustomerId` — Stripe Customer ID for the user (reused across purchases).
- `stripeSubscriptionId` — Stripe Subscription ID (null if free/no subscription).
- `stripePriceId` — Stripe Price ID currently in use for the subscription.
- `stripeCurrentPeriodEnd` — timestamp of the current billing period end (used to show access end dates).
- `stripeCancelAtPeriodEnd` — boolean indicating if cancellation is scheduled at period end.

(See the table definition for exact types and indexes: [server/schema/auth-schema.ts](server/schema/auth-schema.ts#L30-L90)).

**Where these fields are written/updated**

- Webhook handler: `app/api/stripe/webhook/route.ts` updates these fields on events such as `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. This is the primary source of truth when Stripe reports subscription lifecycle changes.
  - Example: on `checkout.session.completed` the webhook fetches the Stripe subscription and writes `stripeSubscriptionId`, `stripePriceId`, `status`, `stripeCurrentPeriodEnd`, `stripeCancelAtPeriodEnd`, and `plan`.
  - Link: [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts)

- Checkout flow server code (`app/api/stripe/checkouts/route.ts`) creates or reuses Stripe customers and can insert/update a local `subscription` row when the checkout is initiated. The webhook finalizes the values because the Checkout Session event is the safe confirmation point.
  - Link: [app/api/stripe/checkouts/route.ts](app/api/stripe/checkouts/route.ts)

**Where these fields are read/used**

- UI pages and components read these fields to show subscription state and enable/disable actions:
  - `app/(protected)/subscription/page.tsx` reads the `subscription` row server-side to render the subscription dashboard and determine `canCancel`, `canCancelImmediately`, `targetPlan`, etc. Link: [app/(protected)/subscription/page.tsx](<app/(protected)/subscription/page.tsx>)
  - `PlanCards` and checkout actions use `stripePriceId` / price mappings to start checkout and decide whether to redirect to Stripe or update an existing subscription: [components/plan-cards.tsx](components/plan-cards.tsx)
  - Client-side session verification (after redirect from Stripe Checkout) uses the Stripe session API via `useFetchStripeSession` and `app/api/stripe/sessions/[id]/route.ts` to verify the Checkout Session object: [client/hooks/useFetchStripeSession.ts](client/hooks/useFetchStripeSession.ts) and [app/api/stripe/sessions/[id]/route.ts](app/api/stripe/sessions/[id]/route.ts)

**Why these fields exist (purpose & importance)**

1. Authoritative app state
   - Stripe is the billing provider, but the app needs a local, queryable representation of billing state for fast server-side rendering, access control, and business logic (e.g., enabling/disabling plan changes or showing expiration dates) without calling Stripe on every request.
2. Access gating and UX
   - Use `status` and `stripeCancelAtPeriodEnd` to determine whether a user retains access until period end, whether plan changes are allowed, and what UI messaging to show.
3. Performance & reliability
   - Local fields reduce external API calls to Stripe for every page render. Webhook-driven updates ensure eventual consistency while keeping read-and-render speed fast.
4. Idempotency and re-use
   - Storing `stripeCustomerId` allows reusing the same Stripe customer for future purchases (better for billing history and avoiding duplicate customers).
5. Billing-specific features
   - `stripeCurrentPeriodEnd` and `stripeCancelAtPeriodEnd` power the “keep access until period end” behavior and scheduled cancellations.

**Typical scenarios and how fields matter**

- New paid subscription via Checkout
  - Flow: user starts Checkout → app inserts/updates a provisional subscription row (maybe only `stripeCustomerId`) → Stripe completes checkout → webhook `checkout.session.completed` writes the full subscription details including `stripeSubscriptionId`, `status`, `stripePriceId`, `stripeCurrentPeriodEnd`, and `plan`.
  - Why important: webhook-confirmed local state prevents race conditions and ensures UI reflects the actual active subscription.

- Upgrading/downgrading in-place
  - Flow: change price via API or Stripe customer subscription update → webhook `customer.subscription.updated` updates local `plan`, `stripePriceId`, and `stripeCurrentPeriodEnd`.
  - Why important: prevents creating duplicate subscriptions and keeps billing continuity.

- Scheduling cancellation (end of period)
  - `stripeCancelAtPeriodEnd` becomes `true` when user chooses to cancel at period end; UI can then disable plan changes and display the date in `stripeCurrentPeriodEnd`.

- Immediate cancellation
  - `customer.subscription.deleted` or admin action sets `plan` to `FREE`, `status` to `canceled`, and clears subscription-specific Stripe fields locally. Use caution: immediate cancellation may revoke access immediately.

**Consistency and eventual correctness**

- Webhook-driven workflow introduces eventual consistency: there can be a short window between a Stripe action and when the webhook updates the DB. The app already mitigates this by:
  - Reading Stripe Checkout Session directly on return (`/api/stripe/sessions/:id`) and using `useFetchStripeSession` to confirm `payment_status` on the client after redirect.
  - Relying on webhooks as the final correct source for background updates.

**Security and correctness considerations**

- Always verify Stripe webhook signatures (`envServer.STRIPE_WEBHOOK_SECRET`) — the webhook handler already does this.
- Do not trust client-sent metadata without server verification.
- Avoid storing sensitive payment details locally (card numbers, CVC). Only keep Stripe IDs and non-sensitive metadata.
- Indexes on `stripeCustomerId` and `userId` (already present) help lookups and protect uniqueness.

**Recommendations & Best Practices**

- Treat webhooks as the canonical asynchronous update mechanism for subscription lifecycle events (create/update/delete).
- For immediate user-visible confirmation after Checkout, re-fetch the Checkout Session (`/api/stripe/sessions/:id`) as the code already does — this avoids waiting for the webhook.
- Use `router.refresh()` or invalidate the `subscription` query (`queryClient.invalidateQueries({ queryKey: ['subscription'] })`) in client components after actions that should re-read local subscription state.
- Use `router.replace()` when navigating to dashboard after a purchase if you want to remove the prior page from history.
- Keep subscription logic (eligibility for actions like `canCancel`) centralized on the server-side page-level rendering so client components render consistent UI.

**Testing and migration notes**

- Test webhook handling locally with `stripe cli` (`stripe listen` + forwarding) and ensure webhook signature is validated. See docs in `docs/logs-for-stripe-cli-webhook-listner.md`.
- If you change field names or types, write a DB migration (Drizzle migrations are under the `drizzle/` folder) and update webhook + server code accordingly.

**Quick reference: where to look in this repo**

- Subscription schema: [server/schema/auth-schema.ts](server/schema/auth-schema.ts)
- Webhook handler (writes local fields): [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts)
- Checkout route (creates/uses customers & subscription rows): [app/api/stripe/checkouts/route.ts](app/api/stripe/checkouts/route.ts)
- Subscription UI (reads local fields): [app/(protected)/subscription/page.tsx](<app/(protected)/subscription/page.tsx>)
- Client-side session verification: [client/hooks/useFetchStripeSession.ts](client/hooks/useFetchStripeSession.ts) and [app/api/stripe/sessions/[id]/route.ts](app/api/stripe/sessions/[id]/route.ts)
- Example client-side usage of `subscription` cache invalidation: [components/cancel-subscription-button.tsx](components/cancel-subscription-button.tsx) and [components/plan-cards.tsx](components/plan-cards.tsx)

---

If you'd like, I can also:

- Add diagrams showing the event flows (Checkout → webhook → DB → UI), or
- Prepare a short checklist to harden webhook handling and testing in production.
