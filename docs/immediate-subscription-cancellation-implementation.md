# Immediate Subscription Cancellation Implementation

## 1. Purpose

The application previously supported only scheduled cancellation. A user could
stop the next renewal, but the Subscription remained active until the current
billing period ended.

This change adds a second, deliberately separate flow for immediate
cancellation. The user can now choose between:

| User choice | Stripe operation | Local result |
| --- | --- | --- |
| Cancel at period end | `subscriptions.update({ cancel_at_period_end: true })` | Subscription stays active until period end |
| Cancel immediately | `subscriptions.cancel(subscriptionId)` | Subscription is canceled now and local access state becomes FREE |

The two operations are intentionally placed in different API routes, React
Query hooks, and client buttons. This makes the business consequences visible
in the code and reduces the risk of accidentally changing the safer scheduled
cancellation behavior.

## 2. What immediate cancellation means in Stripe

Immediate cancellation is not the same as setting
`cancel_at_period_end: true`.

The immediate path calls:

```ts
STRIPE_CLIENT.subscriptions.cancel(subscriptionId)
```

Stripe cancels the existing Subscription immediately. The application should
therefore assume that access to paid features can end immediately after the
successful response.

This implementation does not automatically refund the customer. Refunds,
credits, and proration decisions are separate billing operations and should be
made explicitly according to the product’s refund policy.

The Stripe Customer is intentionally retained. A canceled Subscription is not
the same thing as deleting the Customer, and retaining the Customer allows a
future purchase to reuse the same Stripe Customer record.

## 3. Files changed or added

### 3.1 `app/api/stripe/subscriptions/cancel-immediately/route.ts`

This is the new server endpoint:

```text
POST /api/stripe/subscriptions/cancel-immediately
```

The route performs the following steps:

1. Authenticates the request with `requireAuth()`.
2. Uses the authenticated application user ID to query the local subscription
   row.
3. Refuses requests where no Stripe Subscription ID is stored.
4. Allows only `active` or `trialing` subscriptions.
5. Calls Stripe’s `subscriptions.cancel()` method.
6. Clears the local active billing fields immediately.
7. Returns a small safe response containing the canceled Subscription ID and
   status.

The browser never supplies a Stripe Subscription ID. This prevents the client
from selecting another user’s Subscription.

### 3.2 Stripe idempotency key

The immediate cancellation request sends a stable key based on the application
user and Subscription ID:

```text
subscription-cancel-immediately:<userId>:<stripeSubscriptionId>
```

If the server loses the response after Stripe accepts the request and retries
the same logical operation, Stripe can recognize it as the same request rather
than treating it as a new billing action.

The UI disables the button while the request is pending, but the idempotency
key is the server-side protection that matters when requests are retried by
networks or deployment infrastructure.

### 3.3 `client/hooks/useCancelStripeSubscriptionImmediately.ts`

This new React Query mutation hook calls only the immediate endpoint:

```ts
axios.post("/api/stripe/subscriptions/cancel-immediately")
```

It is separate from `useCancelStripeSubscription.ts`, which continues to call
the scheduled-cancellation endpoint. The separate hooks make it harder to
invoke the wrong Stripe behavior accidentally.

### 3.4 `components/cancel-subscription-immediately-button.tsx`

This new client component owns the immediate-cancellation interaction.

Before making the request, it shows a stronger warning that:

- the action ends the subscription now;
- access may end immediately;
- the action cannot be undone by this application.

After a successful response it:

1. Invalidates the `subscription` React Query key.
2. Shows the server confirmation message.
3. Refreshes the server-rendered subscription page.

The button has a separate label and red visual treatment so the destructive
choice is distinguishable from scheduled cancellation.

### 3.5 `app/(protected)/subscription/page.tsx`

The page now computes two independent permissions:

```text
canScheduleCancellation
canCancelImmediately
```

Scheduled cancellation is shown only when the Subscription is active or
trialing, has a Stripe Subscription ID, and is not already scheduled to end.

Immediate cancellation is shown whenever the Subscription is active or
trialing and has a Stripe Subscription ID. This means a user who has already
scheduled cancellation can still choose to end the Subscription immediately.

When scheduled cancellation is already active:

- plan changes are hidden;
- the scheduled end date is displayed;
- the immediate cancellation option remains available.

This avoids changing the price of a Subscription that is already configured to
end while still giving the user the more destructive option explicitly.

### 3.6 `docs/subscription-cancellation-implementation.md`

The earlier cancellation document was updated so that it describes scheduled
cancellation as the original behavior and links to this document for the
immediate flow. Documentation should not claim that an implemented feature is
missing.

## 4. Local database changes after immediate cancellation

After Stripe confirms cancellation, the route updates the local subscription
row to:

```text
plan                    = FREE
status                  = canceled
stripeSubscriptionId    = null
stripePriceId           = null
stripeCurrentPeriodEnd  = null
stripeCancelAtPeriodEnd = false
```

`stripeCustomerId` is deliberately preserved.

Clearing the active Subscription and Price IDs prevents the application from
continuing to treat the user as subscribed. Setting the plan to FREE makes the
page and access checks reflect the immediate result without waiting for a
webhook delivery.

## 5. Webhook behavior after immediate cancellation

The existing webhook does not need a new event type for this feature.

Stripe can send the subscription lifecycle event to:

```text
POST /api/stripe/webhook
```

The existing `customer.subscription.deleted` handler repeats the local cleanup:

1. Sets the application plan to FREE.
2. Sets the status to canceled.
3. Clears the Stripe Subscription ID.
4. Clears the Stripe Price ID.
5. Clears the current-period timestamp.
6. Resets the period-end cancellation flag.
7. Keeps the Stripe Customer ID.

This repetition is intentional. The API route makes the UI correct
immediately, while the webhook reconciles the application with Stripe and
handles cancellations that happen outside the application.

The webhook must remain idempotent because the API route and webhook can both
update the same row. Repeating the same cleanup values is safe.

## 6. End-to-end immediate-cancellation flow

### Step 1: User opens `/subscription`

The server page authenticates the user and loads the local subscription row.
If the status is `active` or `trialing` and a Stripe Subscription ID exists,
the immediate button is rendered.

### Step 2: User selects “Cancel immediately”

The browser shows a confirmation dialog. If the user cancels the dialog, no API
request is made.

### Step 3: Browser sends the immediate request

```http
POST /api/stripe/subscriptions/cancel-immediately
```

The request has no body and does not expose a Stripe Subscription ID from the
client.

### Step 4: Server verifies ownership and status

The server obtains the user from the session and finds that user’s local
subscription row. It rejects missing, already-finished, or unsupported states.

### Step 5: Server calls Stripe

Stripe receives a cancellation request for the existing `sub_...` object. The
operation is performed against the existing Subscription; no Checkout Session,
new Customer, or replacement Subscription is created.

### Step 6: Server updates the local state

The API clears the active billing identifiers and changes the local plan to
FREE. The response confirms the canceled Stripe Subscription ID and status.

### Step 7: Client refreshes the page

The client displays the success message and calls `router.refresh()`. The page
now shows no active paid subscription and no cancellation controls for the
canceled record.

### Step 8: Webhook reconciles the result

Stripe sends the cancellation event. The verified webhook performs the same
local cleanup and provides the durable server-to-server confirmation.

## 7. Difference from scheduled cancellation in this codebase

### Scheduled endpoint

```text
POST /api/stripe/subscriptions/cancel
```

Uses:

```ts
subscriptions.update(id, { cancel_at_period_end: true })
```

Local result:

```text
status remains active/trialing
stripeCancelAtPeriodEnd = true
stripeSubscriptionId remains present
plan remains paid
```

### Immediate endpoint

```text
POST /api/stripe/subscriptions/cancel-immediately
```

Uses:

```ts
subscriptions.cancel(id)
```

Local result:

```text
status = canceled
stripeCancelAtPeriodEnd = false
stripeSubscriptionId = null
stripePriceId = null
plan = FREE
```

Keeping these paths separate makes the difference visible in routing,
business logic, UI labels, database updates, and documentation.

## 8. Test-mode verification checklist

### Immediate cancellation from an active subscription

1. Use one active Test-mode PRO or PREMIUM Subscription.
2. Open `/subscription`.
3. Confirm both cancellation choices are visible.
4. Select “Cancel immediately”.
5. Confirm the warning dialog.
6. Verify the request is sent to
   `/api/stripe/subscriptions/cancel-immediately`.
7. Confirm the response status is successful.
8. In Stripe Test mode, confirm the same `sub_...` is canceled.
9. Confirm no new Customer, Checkout Session, or Subscription was created.
10. Refresh `/subscription` and confirm the plan is FREE/no active
    subscription is shown.
11. Confirm the local row has no active `stripeSubscriptionId` or
    `stripePriceId`.
12. Confirm the cancellation webhook is received and processed.

### Immediate cancellation after scheduled cancellation

1. Start with an active Subscription.
2. Select scheduled cancellation.
3. Confirm the scheduled end date appears.
4. Confirm plan-change controls are hidden.
5. Confirm “Cancel immediately” remains visible.
6. Select immediate cancellation and confirm the warning.
7. Confirm Stripe changes the same Subscription to canceled now.

### Declined confirmation

1. Open the immediate cancellation dialog.
2. Choose Cancel/no.
3. Confirm no POST request was sent.
4. Confirm the Stripe Subscription and local row are unchanged.

## 9. Product decisions still required

Immediate cancellation raises business decisions that are intentionally not
hidden in this code change:

- Should the product issue a full or prorated refund?
- Should paid features stop immediately or after a short grace period?
- Should an invoice credit be created?
- Should immediate cancellation require re-authentication or MFA?
- Should a canceled user be able to resume before the period ends?
- Should support/admin users be able to cancel on behalf of a customer?

The current implementation chooses: no automatic refund, immediate local
access-state change, no resume action, and user-only cancellation.

