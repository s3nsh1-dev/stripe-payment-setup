# Moving This Application from Stripe Test Mode to Live Mode

## 1. Purpose

This document explains what must change when this application moves from Stripe
Test mode to Live mode. It is a deployment and configuration guide, not a
simple “replace `sk_test_` with `sk_live_`” instruction.

Stripe keeps Test mode and Live mode isolated. Test Customers, Prices,
Subscriptions, Checkout Sessions, and webhook secrets do not work with Live
mode keys. Stripe’s [API key documentation](https://docs.stripe.com/keys)
describes the two modes and their separate key sets, and the
[go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)
requires live objects and live webhook endpoints before launch.

## 2. Current application inventory

### 2.1 Server-side Stripe configuration

`server/utils/envServer.ts` loads either `.env.development` or
`.env.production` based on `NODE_ENV`. It validates these server values:

- `STRIPE_SECRET_KEY`;
- `STRIPE_WEBHOOK_SECRET`;
- `APP_URL`;
- database and authentication secrets.

`server/lib/stripe.ts` creates the server-only Stripe client from
`STRIPE_SECRET_KEY`.

The secret key must never be moved into a `NEXT_PUBLIC_*` variable. The server
uses it to create Checkout Sessions, update Subscriptions, retrieve Sessions,
and process webhook-related Stripe data.

### 2.2 Client-side Stripe configuration

`client/utils/envClient.ts` validates:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`;
- `NEXT_PUBLIC_BASE_URL`.

The publishable key is allowed in browser code. It must change from a
`pk_test_...` value to the matching `pk_live_...` value in the production
deployment.

### 2.3 Hard-coded Stripe object IDs

`client/constants/stripeConstants.ts` currently contains Price and Product IDs
used by the application:

- `PRO` Price ID;
- `PREMIUM` Price ID;
- `STRIPE_PRODUCT_ID`;
- `ALLOWED_PRICE_IDS`;
- the sample Checkout Session ID used by the demo.

These IDs are mode-specific. The Live versions must be created in Live mode
and then configured separately. A Test-mode Price ID cannot be used to create
a Live Checkout Session.

The sample Session ID should not be used by production UI. It should either be
removed from production builds or kept only in a development-only demo.

## 3. Test mode and Live mode are separate data stores

The following Test-mode objects cannot be reused in Live mode:

| Test object | Production action |
| --- | --- |
| Test Product | Create or configure the corresponding Live Product |
| Test Price | Create a matching Live recurring Price and record its new ID |
| Test Customer | Let production create a new Live Customer for the real user |
| Test Subscription | Do not migrate it as a real billing subscription |
| Test Checkout Session | Never use it in a production success URL |
| Test webhook secret | Create and configure a separate Live endpoint secret |

The same human email address may exist in both modes, but the Stripe object IDs
are different. A test `cus_...` is not a valid Live Customer ID.

## 4. Required production changes

### 4.1 Activate and configure the Stripe account

Before accepting real money:

1. Complete Stripe account activation and business verification.
2. Confirm business, bank, payout, tax, and statement-descriptor settings.
3. Review Stripe’s prohibited and restricted business rules.
4. Enable two-factor authentication for the Stripe account and team members.
5. Configure customer email, invoice, receipt, dispute, and failed-payment
   settings as required by the product.

Use Stripe’s [account checklist](https://docs.stripe.com/get-started/account/checklist)
and [go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)
before enabling real payments.

### 4.2 Create Live Products and Prices

In the Stripe Dashboard, switch to Live mode and create the production
Product and recurring Prices. Do not assume that matching names create
matching IDs.

Record the new Live values:

```text
STRIPE_PRODUCT_ID=<live product id>
PRO_PRICE_ID=<live pro price id>
PREMIUM_PRICE_ID=<live premium price id>
```

The safest long-term change is to move Price IDs and the Product ID from
source constants into environment-specific configuration. If the constants
remain in code, the deployment process must replace the Test values with Live
values and review the diff before release.

The server must still enforce the allowlist. Do not accept an arbitrary Price
ID from the browser just because it is a Live-mode ID.

### 4.3 Create the Live webhook endpoint

Create a Live-mode webhook endpoint for the production HTTPS URL, for example:

```text
https://example.com/api/stripe/webhook
```

Subscribe only to events the application needs:

- `checkout.session.completed`;
- `customer.subscription.updated`;
- `customer.subscription.deleted`.

Copy the Live endpoint signing secret into the production secret store. The
Live `whsec_...` value is different from the Test-mode or Stripe CLI secret.

Stripe requires the raw request body for signature verification. The existing
webhook route already uses `request.text()` and
`constructEvent(rawBody, signature, endpointSecret)`, which must remain
unchanged in production.

Review Stripe’s [webhook security and reliability guidance](https://docs.stripe.com/webhooks)
before enabling the endpoint.

### 4.4 Create production environment values

The production deployment needs values equivalent to the following. Use a
secrets manager or encrypted deployment variables; do not commit this file.

```dotenv
NODE_ENV=production

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_endpoint_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

APP_URL=https://example.com
NEXT_PUBLIC_BASE_URL=https://example.com
BETTER_AUTH_URL=https://example.com

DATABASE_URL=<production database connection>
BETTER_AUTH_SECRET=<unique production secret>
GITHUB_CLIENT_ID=<production OAuth client id>
GITHUB_CLIENT_SECRET=<production OAuth client secret>
GOOGLE_OAUTH_CLIENT_ID=<production OAuth client id>
GOOGLE_OAUTH_CLIENT_SECRET=<production OAuth client secret>
```

Important rules:

- `sk_live_...` stays server-side.
- `pk_live_...` may be exposed to the browser.
- `whsec_...` stays server-side.
- Production authentication and database secrets must not be copied from
  development.
- `APP_URL` and `NEXT_PUBLIC_BASE_URL` must use HTTPS and the real public
  domain.

Stripe’s [key guidance](https://docs.stripe.com/keys-best-practices) recommends
secret-management systems, restricted keys where possible, key rotation, and
access auditing.

### 4.5 Update Price and Product configuration

Before deploying, update the application’s Stripe mapping:

```ts
PRO: {
  price_id: "<live pro price id>"
}

PREMIUM: {
  price_id: "<live premium price id>"
}
```

Also update:

- `ALLOWED_PRICE_IDS`;
- `PRICE_TO_TIER` keys;
- `STRIPE_PRODUCT_ID`;
- any server-side product or price configuration.

Never leave a Test-mode ID in a Live deployment. A mixed configuration can
produce “No such price” or “No such customer” errors, or cause the app to show
the wrong tier mapping.

### 4.6 Separate production database state

Do not blindly point the Live application at a database containing Test-mode
Stripe IDs. Existing rows may contain `cus_...` and `sub_...` objects that only
exist in Test mode.

Choose one deliberate strategy:

1. Use a fresh production database for real users.
2. Mark existing development rows as non-production and require each user to
   create a Live subscription.
3. Write an explicit, audited migration only if there is real production data
   that must be mapped to Live Customers.

The normal development-to-production path is not to migrate test billing
objects. Real users should create Live Customers and Live Subscriptions after
the deployment is switched to Live mode.

## 5. API key migration procedure

### Before changing production

1. Confirm the Live account is activated.
2. Create Live Product and Price objects.
3. Create the Live webhook endpoint.
4. Save the Live webhook signing secret in the production secret manager.
5. Create or rotate the Live secret key and save it securely. Stripe only
   reveals Live secret keys once.
6. Confirm the production database strategy.
7. Update the environment-specific Price mapping.
8. Verify that the source repository contains no real secret keys.

### Deploying

1. Set `STRIPE_SECRET_KEY` to `sk_live_...`.
2. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the matching `pk_live_...`.
3. Set `STRIPE_WEBHOOK_SECRET` to the Live endpoint’s `whsec_...`.
4. Set the production URL variables to the HTTPS domain.
5. Deploy the server and client together.
6. Confirm the deployed build does not expose server environment variables.
7. Confirm the Live webhook endpoint responds with `2xx` to valid events.

### First production smoke test

Use a real low-value plan or a controlled internal account. Verify:

1. The browser uses the Live publishable key.
2. The Checkout URL is generated by the Live secret key.
3. The Checkout Session ID is a Live object, not a Test object.
4. Stripe creates a Live Customer and Subscription.
5. The success page retrieves the Live Session.
6. `checkout.session.completed` reaches the Live webhook.
7. The production row stores the Live Customer, Subscription, and Price IDs.
8. Upgrade, downgrade, scheduled cancellation, and final cancellation behave
   correctly.

Do not use Test card numbers for this test. Test cards only work with Test
mode. Keep this first transaction controlled and verify the amount before
scaling traffic.

## 6. API version and SDK consistency

The Stripe SDK version in `package.json` and the Stripe account/API version
affect response and event shapes. Before going live:

1. Review the Stripe API version associated with the account and webhook.
2. Review the installed `stripe` Node SDK version.
3. Pin and upgrade deliberately rather than changing versions during launch.
4. Run the complete checkout, update, cancel, and webhook test suite after any
   API version change.

Stripe’s [go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)
specifically calls out API versioning, error handling, duplicate data, and
webhook behavior.

## 7. Rollback plan

If the Live deployment is unhealthy:

1. Stop new checkout traffic or disable the affected plan buttons.
2. Keep the webhook endpoint available so Stripe events are not lost.
3. Investigate API request logs, application logs, and webhook delivery logs.
4. Rotate any key suspected of exposure.
5. Fix the configuration or code and redeploy.
6. Reconcile any Live Customers or Subscriptions created during the incident.

Do not switch a running production deployment back to Test keys while using a
production database. That creates mode/ID mismatches and can make recovery
harder.

## 8. Final migration checklist

- [ ] Stripe account activated for real payments.
- [ ] Live Product created.
- [ ] Live PRO and PREMIUM Prices created.
- [ ] Live Price IDs configured and allowlisted.
- [ ] Live publishable key configured in the browser environment.
- [ ] Live secret key configured only on the server.
- [ ] Live webhook endpoint created over HTTPS.
- [ ] Live webhook signing secret configured.
- [ ] Production URL variables use the real HTTPS domain.
- [ ] Production database does not contain unusable Test-mode Stripe IDs.
- [ ] API version and SDK version reviewed.
- [ ] Key rotation and incident response process documented.
- [ ] First controlled Live transaction completed successfully.

