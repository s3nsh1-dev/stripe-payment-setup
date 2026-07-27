# Stripe Production Security Audit for This Application

## 1. Purpose and scope

This document is a practical security review of the current application. It
explains:

1. What the application already does correctly.
2. What security flaws or production gaps remain.
3. Why each gap matters for real users and real money.
4. What should be added before a production launch.
5. How to prioritize the work.

This is an engineering readiness review, not a formal penetration test, PCI
assessment, legal opinion, or guarantee of security. A real launch should also
include an independent security review appropriate to the business and data
being processed.

Stripe’s [integration security guide](https://docs.stripe.com/security/guide),
[secret-key guidance](https://docs.stripe.com/keys-best-practices), and
[webhook guidance](https://docs.stripe.com/webhooks) should be treated as
companion references.

## 2. Threat model

The application should assume that:

- a user can modify every browser request;
- an attacker can call public API routes without using the UI;
- an authenticated user can be malicious or have a stolen session;
- a network request can be retried, duplicated, delayed, or interrupted;
- a webhook can be delivered more than once or out of order;
- logs, build artifacts, error pages, and browser data can leak information;
- a secret key can be accidentally exposed by a developer or deployment;
- Stripe API responses can contain customer, payment, and billing data;
- third-party dependencies can contain vulnerabilities;
- real billing actions can be expensive and difficult to reverse.

The security goal is not only to hide the secret key. It is to ensure that an
attacker cannot create unauthorized charges, alter another customer’s billing,
forge subscription state, extract session credentials, or use the application
as an unbounded Stripe API proxy.

## 3. What the application already does correctly

### 3.1 Secret and publishable key separation

The Stripe server client is created in `server/lib/stripe.ts` from
`envServer.STRIPE_SECRET_KEY`, and the server environment module uses
`server-only`.

The client configuration uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. This is the
correct separation:

- secret keys stay on the server;
- publishable keys may be used by browser code.

Stripe states that secret keys can perform account-level API operations and
must not be exposed in source code, public repositories, or client apps. See
[Stripe API key authentication](https://docs.stripe.com/api/authentication).

### 3.2 Authentication on the main billing actions

The checkout route and cancellation route call `requireAuth()`. The protected
layout also protects pages under the protected route group.

This prevents anonymous callers from directly creating or canceling a user’s
subscription through those paths.

### 3.3 Server-side Price allowlisting

The checkout route checks `ALLOWED_PRICE_IDS` on the server. It does not trust
the plan name or price supplied by the browser.

This is important because a browser user can edit JSON requests. The server
must decide which Stripe Prices are sellable.

### 3.4 User-to-subscription ownership

The cancellation route looks up the subscription by the authenticated user ID
instead of accepting a browser-provided Stripe Subscription ID. This prevents
an ordinary IDOR-style cancellation request against another user’s record.

The subscription page also reads the database row using the authenticated user
ID.

### 3.5 Hosted Checkout reduces card-data exposure

The application sends the user to Stripe-hosted Checkout and does not receive
raw card numbers, CVC values, or magnetic-stripe data. This significantly
reduces the application’s card-data handling and PCI scope compared with
building a custom card form.

The application must still follow Stripe and payment-industry requirements;
hosted Checkout does not make every part of the application secure by itself.

### 3.6 Webhook signature verification

The webhook route correctly:

1. Reads the raw request body with `request.text()`.
2. Reads the `Stripe-Signature` header.
3. Calls `constructEvent(rawBody, signature, endpointSecret)`.
4. Rejects missing or invalid signatures.

This is the correct foundation. Stripe requires the raw body for signature
verification; parsing and re-serializing JSON first can invalidate the
signature.

### 3.7 Database constraints and transaction locking

The schema enforces one subscription row per application user and unique Stripe
Customer and Subscription IDs. The checkout route also locks the subscription
row during customer lookup/creation.

These choices reduce duplicate local records and reduce some concurrent
checkout races.

### 3.8 No card secrets are stored in the application schema

The subscription table stores Stripe IDs, plan state, status, and billing dates.
It does not store raw card data. Stripe remains responsible for payment-method
storage.

## 4. Security gaps and production risks

The following findings are based on the current repository, not hypothetical
features.

### 4.1 High: Product mutation routes are not protected

The following routes currently call Stripe without authentication or an admin
authorization check:

- `POST /api/stripe/products`;
- `POST /api/stripe/products/[id]`;
- `DELETE /api/stripe/products/[id]`.

An unauthenticated caller could create, modify, archive, or delete Stripe
Products through the application. Even if these are demo routes, leaving them
deployed creates an unauthorized Stripe API proxy.

#### Required fix

Choose one of these production designs:

1. Remove the mutation routes and manage Products/Prices only from Stripe
   Dashboard or an internal deployment script.
2. Protect them with authentication plus a separate admin role/permission.
3. Use a restricted Stripe key or separate admin service with only the needed
   permissions.

Public plan browsing should expose only a curated, read-only catalog. It must
not expose account-management mutations.

### 4.2 High: Checkout Session retrieval has no endpoint authorization

`GET /api/stripe/sessions/[id]` retrieves a Checkout Session using only the
provided Session ID. The protected success page requires login, but the API
route itself has no `requireAuth()` and no ownership check.

Checkout Session IDs are difficult to guess, but they should not be treated as
authorization. Anyone who obtains an ID may be able to retrieve customer,
metadata, payment, and billing information through the endpoint.

#### Required fix

The route should:

1. Require authentication.
2. Retrieve the Session server-side.
3. Verify that `session.metadata.userId` matches the authenticated user, or
   verify that the Session’s Customer matches the user’s stored
   `stripeCustomerId`.
4. Return only the fields the success page needs.

This is defense in depth even though the success URL is inside a protected
route group.

### 4.3 High: The dashboard displays a session token

`app/(protected)/dashboard/page.tsx` renders `data.session.token` in the
browser. A session token is an authentication credential, not a harmless
debugging field.

If it is copied, captured in a screenshot, exposed by a browser extension, or
leaked through a future XSS issue, it may allow session impersonation.

#### Required fix

- Never render the raw session token.
- Never include it in client-side JSON payloads unless absolutely required.
- Show only safe metadata such as session creation time and expiration.
- Revoke/rotate any token that has already been exposed during development.

This should be fixed before real users access the dashboard.

### 4.4 High: Stripe POST operations do not use idempotency keys

The application creates Checkout Sessions, updates Subscriptions, and schedules
cancellations without passing Stripe idempotency keys.

A browser double-click, mobile retry, proxy retry, timeout, or server crash
after Stripe accepts a request can cause the application to repeat an operation.
The database row lock does not protect a Stripe request that happens outside
the database transaction, and it cannot recover a response lost after Stripe
processed the request.

Stripe documents [idempotent requests](https://docs.stripe.com/api/idempotent_requests)
for safely retrying POST operations.

#### Required fix

Generate a server-controlled key for each logical billing intent, for example:

```text
checkout:<userId>:<purchaseAttemptId>
subscription-update:<userId>:<targetPriceId>:<requestId>
subscription-cancel:<userId>:<subscriptionId>:<requestId>
```

Pass the key through Stripe SDK request options. Do not let an untrusted client
choose a reusable key for unrelated operations. Also add UI duplicate-click
protection, but do not use UI protection as a substitute for server
idempotency.

### 4.5 High: Webhook events are not deduplicated or persisted

The webhook verifies signatures, but it does not store processed Stripe Event
IDs. Stripe can deliver the same event more than once, and a server timeout can
make Stripe retry an event after the database update already succeeded.

The current updates are mostly repeatable, but there is no explicit guarantee
that duplicate or conflicting events are handled safely.

Stripe recommends handling duplicate events and does not guarantee event
ordering. See the [webhook best practices](https://docs.stripe.com/webhooks).

#### Required fix

Add a `stripe_event` table with at least:

- unique Stripe Event ID;
- event type;
- received timestamp;
- processed timestamp;
- processing status and error message.

Process an event transactionally:

1. Insert the Event ID with a unique constraint.
2. If it already exists, acknowledge the duplicate safely.
3. Process the event using current Stripe data where necessary.
4. Mark it processed.

For larger traffic, accept the verified event quickly and process it through a
durable queue.

### 4.6 High: State updates assume webhook order

The webhook updates the database immediately from whichever event arrives.
Stripe does not guarantee delivery order. An older event arriving after a
newer event can overwrite the database with stale status or price information.

#### Required fix

- Store event IDs and event timestamps.
- Make updates conditional on the newest known Stripe state where possible.
- Retrieve the current Subscription from Stripe when event data may be stale.
- Reconcile the local row periodically against Stripe.
- Do not grant or remove durable access based only on a browser redirect.

### 4.7 Medium/High: Raw Stripe error messages are returned to clients

Several API routes return:

```ts
{ message: "Something went wrong", error: message }
```

The raw `error.message` can reveal Stripe object IDs, account details, request
context, validation behavior, or internal implementation details. It also
creates inconsistent user-facing errors.

#### Required fix

- Log detailed errors server-side with a request/correlation ID.
- Return stable public error codes and generic messages.
- Map expected errors such as invalid price, declined payment, missing
  subscription, and authentication failure to safe responses.
- Do not return stack traces, request headers, secrets, or raw provider
  responses.

### 4.8 Medium/High: State-changing cookie requests need CSRF protection

Checkout, subscription update, and cancellation rely on the authenticated
browser session. The current routes do not visibly enforce an Origin/Referer
allowlist or a CSRF token.

If the authentication cookie is sent cross-site under the deployed cookie
policy, a malicious site could try to make a logged-in browser submit a state-
changing request.

#### Required fix

- Confirm Better Auth’s production cookie settings use secure, HTTP-only,
  appropriate SameSite behavior.
- Add an Origin allowlist for state-changing application routes.
- Add CSRF tokens if the cookie/session model requires them.
- Reject unexpected content types and cross-origin mutation requests.

Do not assume that a button being absent from the UI is CSRF protection.

### 4.9 Medium: Request bodies are not fully schema-validated

The checkout route validates the Price ID but accepts `quantity` from raw JSON
without enforcing an integer, minimum, maximum, or business rule. Product
routes also accept flexible request bodies without a strict schema.

#### Required fix

Use Zod or equivalent server-side schemas to validate:

- exact string formats;
- allowed Price IDs;
- quantity as a bounded positive integer, or remove it from the public request
  when subscriptions always have quantity one;
- maximum metadata size and allowed metadata keys;
- product field lengths and allowed update fields.

Validation should happen before any Stripe API call.

### 4.10 Medium: Missing rate limits and abuse controls

The application has no visible rate limiting for:

- sign-in and sign-up;
- Checkout Session creation;
- Subscription updates;
- cancellation;
- Stripe catalog API calls.

An attacker can create excessive Stripe API traffic, repeatedly trigger billing
operations, brute-force authentication, or consume application resources.

#### Required fix

Add rate limits based on a combination of user ID, IP, route, and trusted
deployment identity. Add stricter limits to billing mutations. Also enforce
Stripe Dashboard monitoring, spending alerts, and application alerts.

Rate limits should fail safely and should not block Stripe webhook retries.

### 4.11 Medium: Debug API UI should not ship to production

`components/api-buttons.tsx` exposes demo fetch controls and logs Stripe API
responses to the browser console. It is useful during development but can
expose unnecessary catalog, customer, metadata, and payment information to any
user who can access the page.

#### Required fix

- Remove it from the production home page.
- Guard it behind an explicit development flag.
- Remove hard-coded sample Session IDs from production bundles.
- Avoid logging full Stripe responses in browser code.

### 4.12 Medium: No security headers are configured

`next.config.ts` does not configure visible security headers. HTTPS should be
provided by the deployment platform, but the application should also establish
browser security policy.

Recommended production headers include:

- `Strict-Transport-Security` after HTTPS is confirmed;
- `Content-Security-Policy` designed for Next.js, Stripe Checkout, and OAuth;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy` with a restrictive value;
- `Permissions-Policy`;
- `frame-ancestors` through CSP to prevent unwanted embedding.

Stripe’s [integration security guide](https://docs.stripe.com/security/guide)
should be consulted when building a CSP that still permits the chosen Stripe
integration.

### 4.13 Medium: Webhook processing is synchronous and has no durable queue

The webhook retrieves a Subscription and performs a database update before
returning. This is acceptable for a demo, but a production webhook can time
out during database or Stripe delays and trigger retries.

#### Required fix

- Verify the signature at the edge/server endpoint.
- Persist the event quickly.
- Return `2xx` after durable acceptance.
- Process business updates asynchronously.
- Retry failed processing with backoff.
- Alert on repeated failures and unprocessed events.

Stripe’s [fulfillment guidance](https://docs.stripe.com/checkout/fulfillment)
emphasizes that webhooks are required because a customer may never return to
the success page.

### 4.14 Medium: Stripe objects are stored without an audit trail

The subscription row is a useful current snapshot, but it does not record who
requested an upgrade, downgrade, or cancellation, which request caused it, or
which webhook confirmed it.

#### Required fix

Add a billing audit table containing safe values such as:

- application user ID;
- action type;
- old and new plan;
- Stripe object ID;
- request/correlation ID;
- event ID;
- timestamp;
- result status.

Never store raw card data or secret keys in the audit trail.

### 4.15 Medium: Authentication hardening is not demonstrated

The project uses Better Auth, but the repository does not demonstrate the
complete production policy for:

- mandatory email verification before billing;
- strong password rules and breached-password protection;
- MFA for sensitive account actions;
- password-reset abuse controls;
- session revocation after password or security changes;
- account recovery and support verification.

These are required product/security decisions before real users are trusted to
manage billing.

### 4.16 Medium: Payment lifecycle coverage is incomplete

The webhook handles Checkout completion, Subscription update, and Subscription
deletion. Production billing usually also needs explicit handling and user
communication for events such as:

- failed or past-due invoices;
- successful invoice payments;
- payment-method expiration or failure;
- trial ending;
- incomplete subscriptions;
- disputes and refunds where applicable.

The database already has several statuses, but storing a status is not the same
as implementing the user experience and access policy for each status.

## 5. Security and reliability matrix

| Area | Current state | Production assessment |
| --- | --- | --- |
| Secret key server-only | Implemented | Keep and audit |
| Publishable key separation | Implemented | Use matching Live key |
| Hosted card collection | Implemented | Good PCI-scope decision |
| Checkout authentication | Implemented | Add rate limits and idempotency |
| Price allowlist | Implemented | Move values to environment-specific config |
| Subscription ownership | Implemented for billing routes | Add ownership to Session retrieval |
| Webhook signature | Implemented | Add dedupe, ordering, queue, monitoring |
| Product mutation authorization | Missing | Fix before production |
| Session token display | Unsafe | Remove immediately |
| Session retrieval authorization | Missing | Fix before production |
| API idempotency | Missing | Add before real billing |
| Request validation | Partial | Add schemas and bounds |
| Rate limiting | Missing | Add before public launch |
| CSRF/origin protection | Not demonstrated | Verify and implement |
| Security headers | Missing | Add at deployment/app layer |
| Billing audit trail | Missing | Add for support and incident response |
| Failed-payment lifecycle | Partial | Define access and communication rules |

## 6. Prioritized remediation plan

### P0: Fix before accepting real payments

1. Protect or remove Product create/update/delete routes.
2. Require authentication and ownership checks for Checkout Session retrieval.
3. Remove the dashboard Session Token and any full-session debug output.
4. Add Stripe idempotency keys to Checkout creation, Subscription updates, and
   cancellation.
5. Add webhook Event-ID deduplication and safe processing.
6. Replace raw provider errors with generic public errors and structured server
   logs.
7. Add rate limits to authentication and billing mutation routes.
8. Confirm HTTPS, secure cookies, and CSRF/origin protection.
9. Remove or development-gate `ApiButtons` and debug logging.

### P1: Production reliability and access control

1. Add a durable webhook queue and retry worker.
2. Add webhook event ordering/reconciliation logic.
3. Add an explicit admin role for billing/catalog operations.
4. Add request correlation IDs and billing audit records.
5. Configure security headers and a tested Content Security Policy.
6. Define failed-invoice, past-due, unpaid, and dispute access behavior.
7. Add MFA or step-up authentication for high-impact billing actions.

### P2: Operational maturity

1. Use a secrets manager, restricted Stripe keys, and IP restrictions where
   stable egress IPs are available.
2. Rotate keys and webhook secrets on a documented schedule.
3. Add dependency, secret, and container scanning in CI.
4. Add database backups and restore tests.
5. Monitor Stripe API errors, webhook failures, unusual billing volume, and
   authentication attacks.
6. Perform an independent security review and privacy/compliance review.

## 7. Incident response for a Stripe key leak

If a secret or restricted key is exposed:

1. Treat it as compromised immediately.
2. Rotate or expire it in Stripe Dashboard.
3. Replace it in the production secret manager and redeploy.
4. Review Stripe API request logs for unknown IPs, customers, charges,
   refunds, or destructive actions.
5. Review application and CI logs for the exposure source.
6. Rotate related secrets if the environment or deployment system may be
   compromised.
7. Contact Stripe if unauthorized activity is found.

Stripe’s [secret-key incident guidance](https://docs.stripe.com/keys-best-practices)
recommends immediate rotation and API-log investigation.

## 8. Final security conclusion

The application has a sound starting architecture: server-side secret use,
hosted Checkout, authenticated main billing actions, server-side Price
allowlisting, user-scoped cancellation, database constraints, and webhook
signature verification.

It is not yet production-secure because several demo and reliability gaps are
still exposed. The most urgent are unrestricted product mutation routes,
unauthorized Session retrieval, rendering a session token, missing idempotency,
missing webhook deduplication, raw error exposure, and missing abuse controls.

Completing the P0 list should be treated as the minimum security gate before
accepting real customer payments.

