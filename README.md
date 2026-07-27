# Why This Change Is Needed

## The Problem

Your checkout route always called `stripe.checkout.sessions.create({ mode: "subscription" })` — for _every_ plan action, whether it was a brand-new subscriber or someone who already had an active plan.

Stripe's Checkout Session always creates a **new, independent subscription object** when it completes. It has no concept of "this customer already has a plan, please modify it" — it just does what you asked: create a subscription.

**Result:** clicking "upgrade" didn't upgrade anything — it created a _second, separate_ subscription alongside the first. Both were live and billing independently. That's why your dashboard showed two active subscriptions, and why the customer would have been charged the full price of the new plan on top of the old one, instead of just the difference.

## The Fix, Conceptually

|                                | New subscriber                           | Existing subscriber (upgrade/downgrade)         |
| ------------------------------ | ---------------------------------------- | ----------------------------------------------- |
| **What they need**             | To enter payment info for the first time | Nothing new — Stripe already has their card     |
| **Correct Stripe API**         | `checkout.sessions.create()`             | `subscriptions.update()`                        |
| **User experience**            | Redirected to Stripe's hosted page       | Instant — no redirect, no card re-entry         |
| **What happens on completion** | Stripe creates a new subscription        | Stripe modifies the existing one in place       |
| **Billing**                    | Full price of the new plan               | Prorated difference only, charged to saved card |

The mistake was routing both cases through the same API. The fix is to **branch**: check whether the user already has an active subscription before deciding which of the two Stripe APIs to call.

## Why Each Piece of the Fix Exists

- **Checking for an existing active subscription first** — this is the decision point that determines which flow runs. Without it, you can't distinguish "first purchase" from "plan change."
- **`subscriptions.update()` instead of a new session** — modifies the one true subscription object rather than creating a competing one, which is what actually stops the duplication.
- **`proration_behavior: "create_prorations"`** — this is what makes the billing correct. It ensures the customer is charged only the price difference for the remaining billing period, not the full new-plan price on top of what they already paid — matching how real subscription billing (Netflix, Spotify, any SaaS) actually works.
- **Adding `"paused"` to the status enum** — Stripe can report more statuses than your DB currently allows storing; this just makes your DB able to represent every state Stripe can actually send, so a webhook update never fails to write.
- **Frontend handling both response shapes** — since one flow returns a redirect `url` and the other returns an already-completed subscription object, the frontend needs to branch too: redirect in one case, show an in-app confirmation in the other.
- **No webhook changes needed** — because `subscriptions.update()` still fires `customer.subscription.updated`, and you already built that handler to sync your DB. The webhook layer was correct all along; the bug was entirely in _how the checkout route decided to call Stripe_.

## The Underlying Principle

A Checkout Session's job is narrowly "collect payment info I don't have yet." Once you have a customer with a saved card and an active subscription, every future change to _that_ subscription should go through direct subscription APIs, not through Checkout again.

## Files to change, and what to do in each

**1. `app/api/stripe/checkout/route.ts`**

- After the existing customer-creation block, add a check: query the `subscription` table for this user, see if `stripeSubscriptionId` exists and `status === "active"`.
- If yes (existing active subscriber) → call `stripe.subscriptions.update()` on their existing subscription with the new `priceId` and `proration_behavior: "create_prorations"`. Return that result, no Checkout Session created.
- If no (new subscriber) → keep the existing `checkout.sessions.create()` flow exactly as-is.
- Also add `name` and `description` to the `stripe.customers.create()` call (currently missing).

**2. `client/hooks/useCreateCheckoutSession.ts`** (or wherever your checkout mutation hook lives)

- Update the `onSuccess` handler: check if `res.data.url` exists before redirecting. If it doesn't (upgrade/downgrade case), show a success toast/message instead and invalidate your subscription query so the UI refreshes with the new plan.

**4. `app/api/stripe/webhook/route.ts`**

- No changes needed — `customer.subscription.updated` handler you already wrote will correctly catch the upgrade/downgrade event and update your DB. Just confirm this after testing.

## Optional / later (not blocking)

- Decide `proration_behavior` per direction (upgrade vs downgrade) if you want different UX for going down a tier — this is a product decision, not urgent.
- A "billing portal" route (`stripe.billingPortal.sessions.create()`) so users can update a failing/expired card without you building custom UI for it.

That's the full list — everything else (webhook, DB schema shape, checkout for new users) is already correct and doesn't need touching. Enjoy the break.

UI changes:
the following changes only occur on subscription/page.tsx
show the info about current session
for PRO customer show upgrade to "PREMIUM" button
for PREMIUM customer show downgrade to "PRO"
