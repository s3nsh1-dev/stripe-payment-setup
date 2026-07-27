# Stripe Test-Mode Purchase Workflow

## 1. Purpose and scope

This document describes the complete lifecycle of a user buying a plan in
this application while Stripe is in Test mode. It follows the request from
the first button click through Stripe Checkout, the redirect, webhook
processing, database synchronization, and later plan changes.

The workflow has two different paths:

```text
First paid purchase
  Application -> Checkout Session -> Stripe-hosted Checkout -> Subscription

Existing active subscriber changes plan
  Application -> Subscription update -> Webhook synchronization
```

The first path collects payment details. The second path reuses the saved
payment method and modifies the existing Subscription.

## 2. The systems involved

| System | Responsibility |
| --- | --- |
| Browser | Displays plans, starts the request, follows redirects, and renders status |
| Next.js client components | Runs plan-button actions and React Query mutations |
| Next.js API routes | Authenticate, validate, and call Stripe’s server API |
| Stripe Checkout | Collects test payment details for a new subscription |
| Stripe Billing | Owns Customers, Subscriptions, Prices, invoices, and payment state |
| Stripe webhooks | Notifies the application about completed and changed billing state |
| PostgreSQL/Drizzle | Stores the application’s subscription snapshot |

The Stripe secret key is used only on the server. The browser should never
receive `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`.

## 3. Stripe objects used in this project

### 3.1 Product

A Product describes what is being sold. This project uses one product for the
paid tiers.

### 3.2 Price

A Price contains the amount, currency, and recurring billing interval. The
application sends a Price ID such as `price_...` when it creates Checkout or
updates a Subscription.

The application maps allowed Price IDs to application tiers in
`client/constants/stripeConstants.ts`:

```text
PRO price      -> PRO
PREMIUM price  -> PREMIUM
```

### 3.3 Customer

A Customer represents the person or organization paying Stripe. The project
reuses the same Customer ID for future purchases so saved payment methods are
available for plan changes.

### 3.4 Checkout Session

A Checkout Session is a temporary hosted payment flow. In this project its ID
looks like `cs_test_...` in Test mode. Its URL sends the user to Stripe’s
hosted page.

The Session is not the same thing as the long-lived Subscription.

### 3.5 Subscription

A Subscription represents recurring billing. Its ID looks like `sub_...` and
is the object updated during a PRO/PREMIUM change.

### 3.6 Webhook event

A webhook event is Stripe’s server-to-server notification to the application.
The browser redirect is not a replacement for a webhook because users can
close the browser and billing can change outside the application.

## 4. Test-mode prerequisites

Before testing, confirm all of the following:

1. The Stripe Dashboard is switched to **Test mode**.
2. The server uses a matching `sk_test_...` secret key.
3. The Price IDs in `stripeConstants.ts` belong to the same Stripe account and
   Test mode.
4. `APP_URL` points to the running application URL.
5. `STRIPE_WEBHOOK_SECRET` belongs to the webhook endpoint forwarding to this
   application.
6. The database migrations have created the `subscription` table and its
   status enum.
7. The authenticated user exists in the application database.

For successful test payments, use the test cards documented in
[`stripe-fake-payment-credentials.md`](./stripe-fake-payment-credentials.md).
The common successful card is `4242 4242 4242 4242` with any future expiry and
any three-digit CVC.

Test data is isolated from live data. A Test-mode Customer, Subscription, and
payment will not appear in Live mode.

## 5. First purchase: complete step-by-step flow

### Step 1: The user chooses a plan

The user opens the plan-selection page. `PriceListing` renders the available
plans and `PlanCards` renders each button.

The selected plan is converted into its configured Stripe Price ID. The
browser does not decide the final Stripe amount; it sends the allowed Price ID
to the server, where the server validates it again.

### Step 2: The browser sends the checkout request

`PlanCards` calls `useCreateCheckoutSession`, which sends:

```http
POST /api/stripe/checkouts
Content-Type: application/json

{"priceId":"price_...","quantity":1}
```

The browser sends no secret Stripe credentials. Authentication is carried by
the application session cookie.

### Step 3: The server authenticates and validates

`app/api/stripe/checkouts/route.ts`:

1. Calls `requireAuth()`.
2. Reads `priceId` and `quantity`.
3. Rejects a missing Price ID.
4. Rejects a Price ID not in `ALLOWED_PRICE_IDS`.

This protects the endpoint even if a user edits the browser request.

### Step 4: The server finds or creates the Stripe Customer

Inside a database transaction, the route locks the user’s subscription row.

- If `stripeCustomerId` exists, it is reused.
- Otherwise the route loads the application user and calls
  `stripe.customers.create()` with email, name, description, and metadata.
- The new Customer ID is stored in the subscription row.

The Customer is reused because it owns the saved payment method and links
future Subscription operations to the same Stripe account holder.

### Step 5: The server chooses the first-purchase branch

For a new or not-yet-active user, the route does not find both of these values:

```text
status = active
stripeSubscriptionId = present
```

It therefore calls:

```ts
stripe.checkout.sessions.create({
  customer: customerId,
  mode: "subscription",
  line_items: [{ price: priceId, quantity }],
  success_url: ".../checkout/success?session_id={CHECKOUT_SESSION_ID}",
  cancel_url: ".../checkout/cancel",
  metadata: { userId, customerId, priceId }
})
```

`{CHECKOUT_SESSION_ID}` is a Stripe placeholder. Stripe replaces it with the
real Checkout Session ID when it redirects the browser back to the app.

### Step 6: The server returns the Checkout URL

The API response has this shape:

```json
{
  "message": "Checkout session created",
  "data": {
    "id": "cs_test_...",
    "url": "https://checkout.stripe.com/..."
  }
}
```

`PlanCards` checks for `res.data.url` and navigates the browser to that URL.

### Step 7: Stripe-hosted Checkout collects test payment details

The user enters test payment information on Stripe’s hosted page. Stripe
validates the test card and creates the payment and subscription objects in
Test mode.

For a successful test card, Stripe typically creates or updates related
objects such as:

1. Customer;
2. Checkout Session;
3. Subscription;
4. Invoice;
5. Payment Intent or charge-related payment state.

The exact set of related objects can vary with payment method and Stripe
configuration, but the application’s recurring billing object is the
Subscription.

### Step 8: Stripe redirects back to the success page

Stripe sends the browser to a URL such as:

```text
/checkout/success?session_id=cs_test_...
```

The success page reads `session_id` from `searchParams`. It then requests:

```http
GET /api/stripe/sessions/cs_test_...
```

The server retrieves the Session with the secret Stripe client. This is why
the lookup must use the same Test-mode secret key that created the Session.

The API response is wrapped as:

```json
{
  "message": "Session successfully fetched",
  "data": { "id": "cs_test_...", "payment_status": "paid" }
}
```

The success page therefore reads `data.data.payment_status` and displays the
confirmation when the payment status is `paid`.

The redirect confirms the Checkout Session to the current browser, but it is
not the application’s durable database synchronization mechanism.

### Step 9: Stripe sends webhook events

Separately, Stripe sends events to:

```text
POST /api/stripe/webhook
```

The webhook route must receive the raw request body because Stripe’s signature
is calculated from the exact raw bytes. It verifies the signature before
processing the event.

For `checkout.session.completed`, the route:

1. Reads `userId` from Checkout metadata.
2. Reads the Customer ID and Subscription ID from the Session.
3. Retrieves the full Subscription from Stripe.
4. Extracts its current Price ID, status, period end, and cancellation state.
5. Updates the application’s subscription row.

After this step, the local database has the durable subscription snapshot used
by the subscription page.

## 6. Existing subscriber changes plan

### Step 1: The subscription page reads current state

The protected subscription page authenticates the user and queries the
subscription row by `userId`.

- Active PRO shows “Upgrade to PREMIUM”.
- Active PREMIUM shows “Downgrade to PRO”.
- No active paid subscription shows a link to choose a new plan.

The target button still uses the same plan-price mapping as the home page.

### Step 2: The browser sends the same API request

The target button calls:

```http
POST /api/stripe/checkouts
{"priceId":"price_for_the_target_plan","quantity":1}
```

The endpoint name is retained for reuse, but the server may now perform a
Subscription update instead of creating Checkout.

### Step 3: The server detects an active Subscription

The database row contains:

```text
status = active
stripeSubscriptionId = sub_...
```

The route retrieves the current Stripe Subscription to obtain the current
subscription item ID.

### Step 4: Stripe updates the existing Subscription

The route calls:

```ts
stripe.subscriptions.update(subscriptionId, {
  items: [{ id: currentItemId, price: targetPriceId }],
  proration_behavior: "create_prorations"
})
```

The Subscription ID remains the same. Only the selected price item changes.
This is the behavior that prevents a second active Subscription.

### Step 5: The API returns a different response

There is no hosted Checkout URL:

```json
{
  "message": "Subscription successfully updated",
  "data": {
    "id": "sub_...",
    "status": "active"
  }
}
```

`PlanCards` detects the missing URL, shows an in-app success message, invalidates
the subscription query key, and refreshes the server-rendered page.

### Step 6: Stripe sends `customer.subscription.updated`

The webhook receives the update event and writes the new Price ID, plan,
status, billing-period end, and cancellation flag into the application
database.

The next page refresh then shows the new plan and the opposite available
action.

## 7. Cancel and failure paths

### User cancels hosted Checkout

Stripe sends the browser to:

```text
/checkout/cancel
```

No completed subscription should be treated as paid just because Checkout was
opened.

### Payment is incomplete or unsuccessful

The Checkout Session can have a payment status other than `paid`. The success
page should display a non-confirmed state until the payment is actually
successful.

### Subscription is deleted or canceled

Stripe sends `customer.subscription.deleted`. The webhook changes the local
plan to FREE, clears the active Subscription and Price IDs, and keeps the
Customer ID so the person can subscribe again without creating another
Customer.

## 8. Test-mode verification checklist

### Verify a first purchase

1. Sign in as a user with no active subscription.
2. Select PRO.
3. Confirm the server returns a Checkout URL.
4. Complete Checkout with a test card.
5. Confirm the browser returns with a `cs_test_...` session ID.
6. Confirm the success page displays the paid state.
7. In the Stripe Dashboard Test mode, verify one Customer and one active
   Subscription.
8. Verify the local subscription row has `stripeSubscriptionId`,
   `stripePriceId`, `status`, and `plan`.

### Verify an upgrade

1. Start with one active PRO Subscription.
2. Open `/subscription`.
3. Select “Upgrade to PREMIUM”.
4. Confirm the request does not redirect to Stripe Checkout.
5. Confirm the response contains a Subscription object and no `url`.
6. In Stripe Test mode, confirm the original `sub_...` ID is unchanged.
7. Confirm its Price changed to the PREMIUM Price.
8. Confirm only the expected prorated billing adjustment was created.
9. Wait for `customer.subscription.updated` and refresh `/subscription`.
10. Confirm the page now shows PREMIUM and offers downgrade to PRO.

### Verify a downgrade

Repeat the same process from PREMIUM to PRO. The Subscription ID should still
be unchanged.

## 9. Troubleshooting by symptom

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Session retrieval returns `isError` | Wrong route parameter handling, wrong key, or wrong mode | Confirm the route receives the ID and the server uses the matching `sk_test_...` key |
| New purchase does not redirect | Client did not read `res.data.url` | Inspect the checkout mutation response |
| Upgrade redirects to Checkout | Active subscription branch was not selected | Check local `status` and `stripeSubscriptionId` |
| Two active subscriptions appear | A second Checkout Session was created for an active customer | Inspect the checkout route branch and existing database row |
| Stripe changed but UI still shows old plan | Webhook has not arrived or local plan sync failed | Inspect webhook delivery and `customer.subscription.updated` logs |
| Webhook returns 400 | Missing or invalid signature | Check raw-body handling and `STRIPE_WEBHOOK_SECRET` |
| Test payment cannot find the customer | Test/live mode mismatch or different Stripe account | Compare key prefix, Dashboard mode, Customer ID, and Price ID |
| Success page says payment is incomplete | Session was not paid or the response nesting is wrong | Check `data.data.payment_status` and the Stripe Session |

## 10. Final mental model

Use Checkout once when payment details must be collected. After that, use the
existing Subscription ID for every plan change. Use the browser redirect for
the immediate Checkout result, and use webhooks for durable synchronization.

