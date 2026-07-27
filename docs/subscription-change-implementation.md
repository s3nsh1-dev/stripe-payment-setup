# Subscription Change Implementation Guide

## 1. Purpose

This document explains the subscription-change implementation added to this
project. It describes what changed in each file, which concept the change
introduces, and why the change is necessary.

The original problem was that every paid-plan button called
`stripe.checkout.sessions.create({ mode: "subscription" })`. That API is
correct for a first purchase, but it always creates a new Subscription when
Checkout completes. It does not mean “change the customer’s current plan.”

Therefore, an existing PRO customer who selected PREMIUM received a second
subscription instead of an upgrade. The implementation now separates the two
business cases:

| Customer state | Stripe operation | Browser behavior |
| --- | --- | --- |
| No active subscription | Create a Checkout Session | Redirect to Stripe-hosted Checkout |
| Active subscription | Update the existing Subscription | Stay in the app and show confirmation |

This distinction is the central design change.

## 2. Concepts introduced or clarified

### 2.1 Checkout Session versus Subscription

A Checkout Session is a temporary payment-collection flow. It is useful when a
customer needs to enter payment information or approve a new purchase.

A Subscription is the long-lived Stripe billing object. Once the customer has
an active Subscription and a saved payment method, plan changes should modify
that Subscription directly.

Using a new Checkout Session for every plan change creates independent
Subscriptions. Updating the existing Subscription keeps one billing object,
one payment history, and one renewal cycle.

### 2.2 Stripe identifiers have different meanings

The application stores several Stripe IDs, and each one identifies a different
object:

- `stripeCustomerId`: the Stripe customer who owns payment details.
- `stripeSubscriptionId`: the long-lived recurring subscription.
- `stripePriceId`: the current price selected inside that subscription.
- Checkout Session ID (`cs_test_...` in test mode): the temporary hosted
  Checkout transaction that can be retrieved after redirect.

The upgrade operation uses `stripeSubscriptionId`, not a Checkout Session ID.

### 2.3 Database state decides the operation

The checkout route treats a record as an existing subscriber only when both
conditions are true:

```text
status === "active"
stripeSubscriptionId exists
```

If either condition is false, the request follows the new-customer Checkout
flow. This prevents an incomplete, canceled, or missing subscription from
being treated as an active plan.

### 2.4 Proration

The update request uses:

```ts
proration_behavior: "create_prorations"
```

Stripe calculates the remaining value of the current billing period and
creates the appropriate prorated charge or credit. Without this setting, a
plan change could produce an unexpected full-price charge or fail to represent
the intended mid-cycle adjustment.

The project currently uses the same proration policy for upgrades and
downgrades. Choosing different behavior for each direction is a later product
decision.

## 3. File-by-file changes

### 3.1 `app/api/stripe/checkouts/route.ts`

This is the main server-side change. It remains the single endpoint used by
the plan buttons, but it now decides which Stripe API should run.

#### Step 1: Authenticate and validate the request

The route still calls `requireAuth()` and rejects requests without an
authenticated user. It then validates that:

- a `priceId` was provided;
- the `priceId` belongs to `ALLOWED_PRICE_IDS`.

This keeps the browser from selecting an arbitrary Stripe price.

#### Step 2: Lock and inspect the user’s subscription row

The database transaction selects the user’s subscription row with a row lock:

```ts
.where(eq(subscription.userId, userId))
.for("update")
```

The lock reduces race conditions when two checkout requests arrive close
together. The transaction returns both the reusable customer ID and the
subscription row so the decision can be made after the transaction.

#### Step 3: Reuse or create the Stripe Customer

If `stripeCustomerId` already exists, the route reuses it. Otherwise it loads
the authenticated user and creates a Stripe Customer with:

- email;
- name;
- description;
- metadata containing the application user ID and username.

The customer is stored or attached to the application’s subscription row.
The customer is created once because the customer object represents the person
and their saved payment methods, not an individual plan purchase.

#### Step 4: Update an active Subscription

For an active subscription with a `stripeSubscriptionId`, the route first
retrieves the current Stripe Subscription. Stripe subscription items have
their own IDs, so the update must include the existing item ID:

```ts
items: [{ id: currentItem.id, price: priceId }]
```

The route then calls `stripe.subscriptions.update()` with proration enabled.
It returns the updated Subscription object and does not create a Checkout
Session.

This is what prevents duplicate subscriptions.

#### Step 5: Create Checkout for a new subscription

If the active-subscription condition is not met, the existing hosted Checkout
flow remains in place. It creates a subscription-mode Checkout Session with:

- the reusable Stripe customer;
- the selected price as a line item;
- the success URL containing `{CHECKOUT_SESSION_ID}`;
- the cancel URL;
- metadata for `userId`, `customerId`, and `priceId`.

The response shape is still:

```ts
{
  message: "Checkout session created",
  data: checkoutSession
}
```

The Checkout URL is inside `data.url`.

### 3.2 `components/plan-cards.tsx`

The server now has two valid response shapes, so the client cannot always
redirect to `res.data.url`.

The success handler now follows this order:

1. Read `res.data.url`.
2. If the URL exists, redirect the new customer to Stripe-hosted Checkout.
3. If the URL does not exist, treat the response as an in-app subscription
   update.
4. Invalidate the `subscription` React Query key.
5. Show a success message.
6. Call `router.refresh()` so the server-rendered subscription page can read
   the latest database state.

This is a response-contract branch, not just a UI convenience. A subscription
update returns a Stripe Subscription object, so assigning its missing `url`
property to `window.location` would cause an invalid redirect.

The FREE action now uses `window.location.assign("/dashboard")` and returns
early. The old typo in the confirmation message was also corrected.

### 3.3 `app/api/stripe/webhook/route.ts`

The webhook remains the asynchronous synchronization layer between Stripe and
the application database.

It performs three important tasks:

1. Reads the raw request body.
2. Verifies the `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
3. Handles Stripe subscription events.

The handled events are:

- `checkout.session.completed`: stores the new customer, subscription, price,
  status, period end, and plan.
- `customer.subscription.updated`: stores the changed price, plan, status,
  period end, and cancellation setting.
- `customer.subscription.deleted`: returns the application plan to FREE and
  clears the active subscription fields.

The `plan` update in `customer.subscription.updated` is important. Stripe
changes the price, but the application also keeps a readable plan enum. Both
must stay synchronized or the UI can continue showing PRO after Stripe has
already changed the subscription to PREMIUM.

The webhook is still needed even though the update route returns immediately:
Stripe is the billing system of record, and subscription state can also change
outside this application.

### 3.4 `app/(protected)/subscription/page.tsx`

This page is a server component. It authenticates the user, queries the
subscription row, and renders the current billing state.

It displays:

- current plan;
- subscription status;
- Stripe subscription ID;
- Stripe price ID;
- current billing-period end;
- whether cancellation is scheduled at period end.

For an active PRO subscription, it renders a target PREMIUM plan card and an
“Upgrade to PREMIUM” button. For an active PREMIUM subscription, it renders a
target PRO plan card and a “Downgrade to PRO” button.

For a user without an active paid subscription, the page explains that a new
Checkout Session is required and links back to the plan-selection page.

The page intentionally uses the same `PlanCards` client component. This keeps
the plan-price mapping and mutation behavior in one place while allowing the
server page to decide which target plan is valid.

### 3.5 `server/lib/auth.ts`

The server Better Auth configuration previously referenced
`envServer.NEXT_PUBLIC_BASE_URL`, but that property is not part of the server
environment schema. The server already defines `BETTER_AUTH_URL`, so the
Better Auth server instance now uses that variable.

This is a configuration/type-safety correction. Public client configuration and
server configuration should not be mixed accidentally.

### 3.6 Existing schema and migration support

The subscription schema already contains the fields required by the flow:

- `plan`;
- `status`;
- `stripeCustomerId`;
- `stripeSubscriptionId`;
- `stripePriceId`;
- `stripeCurrentPeriodEnd`;
- `stripeCancelAtPeriodEnd`.

The status enum already includes `paused`, which allows the database to store
Stripe’s paused state if it is emitted by a webhook.

No new migration is required for the implementation described here.

## 4. Response contracts

### New subscriber

```json
{
  "message": "Checkout session created",
  "data": {
    "id": "cs_test_...",
    "url": "https://checkout.stripe.com/..."
  }
}
```

The browser uses `data.url` and leaves the application.

### Existing subscriber

```json
{
  "message": "Subscription successfully updated",
  "data": {
    "id": "sub_...",
    "status": "active",
    "items": { "data": [{ "price": { "id": "price_..." } }] }
  }
}
```

There is no Checkout URL because no hosted payment-information step is
needed. The browser stays in the application.

## 5. Why the webhook and database are both used

The route makes the immediate Stripe request. The webhook confirms and
reconciles the eventual Stripe state.

This separation matters because:

- the browser can close after the Stripe API request;
- webhook delivery is retried by Stripe when the application returns an error;
- subscription changes can happen from Stripe’s Dashboard or another Stripe
  integration;
- the application should not rely only on a browser callback to update billing
  state.

The UI should therefore tolerate a short delay between a successful Stripe
operation and the webhook database update.

## 6. Expected result

After the change:

1. A first purchase creates one Stripe Customer and one Checkout Session.
2. Checkout completion creates one Subscription.
3. The webhook stores that Subscription in the application database.
4. A later PRO/PREMIUM change updates the same Subscription ID.
5. Stripe prorates the billing change.
6. The webhook updates the application’s plan and billing fields.
7. The subscription page shows the new plan instead of offering a duplicate
   purchase path.

