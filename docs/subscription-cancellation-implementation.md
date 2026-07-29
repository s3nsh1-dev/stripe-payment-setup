# Subscription Cancellation Implementation

## 1. Purpose

This document explains the subscription-cancellation feature added to the
project. It covers the files touched, the application logic, the Stripe API
operation, the database changes, the webhook behavior, and the complete test
flow.

The implementation uses **scheduled cancellation**. When the user clicks
Cancel subscription:

- Stripe marks the existing Subscription with `cancel_at_period_end: true`.
- The Subscription is not deleted immediately.
- The customer keeps access until the already-paid billing period ends.
- Stripe does not create another renewal after that period.
- The application displays that cancellation is scheduled.

This is safer for a normal SaaS product than immediately deleting a paid
Subscription, because it avoids removing access before the customer’s paid
period is finished and avoids accidental immediate cancellation.

## 2. Scheduled cancellation versus immediate cancellation

Stripe provides two different ideas that are easy to confuse:

| Behavior | Stripe operation | Customer access |
| --- | --- | --- |
| Cancel at period end | `subscriptions.update({ cancel_at_period_end: true })` | Continues until the period ends |
| Cancel immediately | `subscriptions.cancel(subscriptionId)` | Ends immediately according to Stripe’s cancellation rules |

The original implementation implemented the first behavior. The application
now supports both behaviors through separate routes, hooks, and buttons. The
existing `stripeCancelAtPeriodEnd` database field continues to represent only
the scheduled-cancellation state.

The cancellation request does not refund the customer automatically. It also
does not remove the Stripe Customer, because the Customer may be reused if the
person subscribes again later.

## 3. Files touched

### 3.1 `app/api/stripe/subscriptions/cancel/route.ts`

New protected server endpoint:

```text
POST /api/stripe/subscriptions/cancel
```

This route owns the trusted cancellation decision. The browser does not send a
Stripe Subscription ID, so a user cannot choose another user’s subscription by
editing a request payload.

The route performs these steps:

1. Calls `requireAuth()`.
2. Queries the subscription row using the authenticated application user ID.
3. Rejects the request if no `stripeSubscriptionId` is stored.
4. Allows cancellation for `active` or `trialing` subscriptions.
5. Returns an idempotent success response if cancellation was already
   scheduled.
6. Calls Stripe with `cancel_at_period_end: true`.
7. Immediately updates the local cancellation flag and billing-period end.
8. Returns the updated Stripe Subscription.

The important Stripe call is:

```ts
await STRIPE_CLIENT.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});
```

The route intentionally does not call `subscriptions.cancel()`. That would be
an immediate cancellation and would provide a different product experience.

### 3.2 `client/hooks/useCancelStripeSubscription.ts`

New React Query mutation hook. It sends the client request to the cancellation
endpoint without accepting a Subscription ID:

```ts
axios.post("/api/stripe/subscriptions/cancel")
```

Keeping the hook small separates the HTTP operation from the button’s UI
behavior and makes the mutation reusable later for another cancellation
control.

### 3.3 `components/cancel-subscription-button.tsx`

New client component responsible for the interactive part of cancellation.

Its flow is:

1. Ask the user for confirmation with `window.confirm()`.
2. Do nothing if the user declines.
3. Disable the button while the request is pending.
4. Call the cancellation mutation.
5. On success, invalidate the `subscription` React Query key.
6. Show the server response message.
7. Call `router.refresh()` so the server-rendered subscription page reads the
   latest database row.
8. Show an error message if Stripe or the API request fails.

The confirmation step is important because cancellation changes future billing
behavior. The action is not silently triggered by an accidental click.

### 3.4 `app/(protected)/subscription/page.tsx`

The protected subscription page now imports the cancellation button and
computes whether the current row can be canceled.

The button appears only when all of these are true:

```text
status is active or trialing
stripeSubscriptionId exists
stripeCancelAtPeriodEnd is false
```

When cancellation is already scheduled, the page shows:

- the scheduled-cancellation state;
- the current period end date;
- a message that access remains available until that date.

The page continues to show the current plan and plan-change controls. A
scheduled cancellation does not immediately make the plan FREE because the
Stripe Subscription remains active through the paid period.

## 4. Why the server looks up the subscription by user

The user’s browser is not trusted to identify the resource it wants to cancel.
The route uses the authenticated user ID and queries:

```ts
where(eq(subscription.userId, userSession.user.id))
```

This creates an ownership boundary:

```text
Authenticated application user
        |
        v
Application subscription row
        |
        v
Stored stripeSubscriptionId
        |
        v
Stripe subscription update
```

The client can request cancellation, but only the server decides which Stripe
Subscription belongs to that user.

## 5. Immediate application state update

Stripe is the billing system of record, but the route also updates the local
database immediately after Stripe accepts the request:

- `status` is synchronized with the returned Stripe Subscription;
- `stripeCancelAtPeriodEnd` becomes `true`;
- `stripeCurrentPeriodEnd` is refreshed from the Stripe subscription item.

This makes the UI accurate immediately, without waiting for webhook delivery.
The webhook remains necessary because Stripe can retry events or receive
changes from the Dashboard and other integrations.

## 6. Webhook behavior

No new webhook event handler is required for scheduled cancellation.

The existing `customer.subscription.updated` handler already updates:

- plan;
- price ID;
- status;
- current period end;
- `stripeCancelAtPeriodEnd`.

When the current period finally ends, Stripe completes the cancellation and
emits the subscription-deleted lifecycle event. The existing
`customer.subscription.deleted` handler then:

1. Sets the application plan to `FREE`.
2. Sets the local status to `canceled`.
3. Clears `stripeSubscriptionId`.
4. Clears `stripePriceId`.
5. Clears the period-end timestamp.
6. Resets `stripeCancelAtPeriodEnd` to `false`.
7. Keeps `stripeCustomerId` for possible future reuse.

The Customer is kept deliberately. Canceling a subscription is not the same as
deleting a customer.

## 7. End-to-end runtime flow

### Step 1: User opens the subscription page

The server component authenticates the user and reads the subscription row.
For an active subscription without a scheduled cancellation, the page renders
the Cancel subscription button.

### Step 2: User clicks the button

The client component asks for confirmation. If confirmed, it sends:

```http
POST /api/stripe/subscriptions/cancel
```

There is no request body and no user-provided Stripe ID.

### Step 3: The API authenticates and finds ownership

The route obtains the current application user from the session, queries the
subscription table, and checks that the row has a usable Stripe Subscription
ID.

### Step 4: The server requests scheduled cancellation from Stripe

Stripe receives:

```text
Subscription: sub_...
cancel_at_period_end: true
```

Stripe keeps the Subscription active until its current period end, but marks
it so that it will not renew.

### Step 5: The application updates its snapshot

The API updates the local row and returns success. The client displays a
confirmation and refreshes the page.

### Step 6: Stripe sends the update webhook

Stripe sends `customer.subscription.updated` to:

```text
POST /api/stripe/webhook
```

The webhook verifies the Stripe signature and stores the cancellation flag.

### Step 7: The period ends

At the end of the current paid period, Stripe stops renewal and completes the
cancellation lifecycle. The deletion event causes the application to mark the
plan FREE and clear the active Subscription ID.

## 8. API response behavior

### Successful first cancellation

```json
{
  "message": "Subscription cancellation scheduled",
  "data": {
    "id": "sub_...",
    "status": "active",
    "cancel_at_period_end": true
  }
}
```

### Cancellation already scheduled

The route treats a repeated request as safe and returns success rather than
calling Stripe again:

```json
{
  "message": "Subscription cancellation is already scheduled",
  "data": {
    "stripeSubscriptionId": "sub_...",
    "cancelAt": "2026-..."
  }
}
```

This makes the operation effectively idempotent from the user’s perspective.

### No subscription found

The route returns `404` when the authenticated user has no stored Stripe
Subscription ID. This is different from a Stripe failure: the user simply has
nothing active to cancel.

### Unsupported state

The route returns `400` for statuses outside `active` and `trialing`. Canceled,
unpaid, incomplete, or expired records should not be sent through this
cancellation action.

## 9. Test-mode verification checklist

1. Use a Test-mode user with one active PRO or PREMIUM Subscription.
2. Open `/subscription`.
3. Confirm the current plan, Subscription ID, and period end are visible.
4. Click Cancel subscription.
5. Confirm the browser confirmation dialog.
6. Verify the API request is `POST /api/stripe/subscriptions/cancel`.
7. Verify the response contains `cancel_at_period_end: true`.
8. In the Stripe Test-mode Dashboard, open the same `sub_...` record.
9. Confirm the Subscription is still active but scheduled to cancel at period
   end.
10. Confirm no second Subscription was created.
11. Refresh `/subscription` and confirm the cancellation message is visible.
12. Confirm the local row has `stripeCancelAtPeriodEnd = true`.
13. Confirm the webhook received `customer.subscription.updated`.

For a full lifecycle test, use a short test billing period if configured, or
wait until the period ends. Then confirm the deletion webhook changes the local
plan to FREE and clears the active Subscription ID.

## 10. What this feature does not implement

Immediate cancellation is implemented separately in
[`immediate cancellation implementation`](./immediate-subscription-cancellation-implementation.md).

The scheduled-cancellation flow still does not provide:

- refunds or credits;
- a “resume subscription” action;
- changing the cancellation date;
- a billing portal for payment-method management.

A future resume action would call Stripe with
`cancel_at_period_end: false`, verify that the period has not ended, update the
local flag, and refresh the page.

## 11. Final mental model

The application does not delete the Subscription when the user clicks Cancel.
It asks Stripe to stop renewal at the end of the current period, records that
state locally, displays the scheduled cancellation, and relies on Stripe’s
webhook lifecycle to finalize the database state when the period actually
ends.
