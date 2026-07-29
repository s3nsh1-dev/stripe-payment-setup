# Review of `docs/notes.md`: Production Transformation Plan

## 1. Review scope

This document reviews every item currently listed in `docs/notes.md` against
the repository as it exists today.

No TypeScript or TSX files were changed while preparing this review. The only
file added is this Markdown document, because the notes explicitly requested a
written assessment.

The short conclusion is:

> The proposed direction is good, but moving to Live mode should happen only
> after the authentication, catalog, secret-management, deployment, and
> production-security decisions are made deliberately. Replacing the Stripe
> key alone is not a production migration.

## 2. Current repository state

| Area | Current state | Review consequence |
| --- | --- | --- |
| Stripe credentials | Loaded from environment variables with `dotenv` | Suitable for development; production should use a secret manager |
| Stripe catalog | Products and Prices are hard-coded in `stripeConstants.ts` | Database-backed catalog requires schema, server, and client TypeScript changes |
| AWS infrastructure | No Terraform files or AWS integration exist | Infrastructure work can be planned independently, but not completed from this repository alone |
| Caddy | `CaddyFile` is empty | Reverse-proxy configuration still needs to be designed |
| Docker | `DockerFile` and `docker-compose.yml` are empty | Container deployment is not currently defined |
| Authentication | Better Auth email/password is enabled server-side | Signup is wired; email/password sign-in UI is not wired |
| Email verification | `emailVerification: {}` exists without a visible mail-sending implementation | Production verification and password recovery are incomplete |
| Documentation | Multiple Stripe production and security guides exist | This document connects the new notes to those earlier recommendations |

## 3. Review of each note

### 3.1 Switch to Live Stripe credentials

#### Verdict: Required for launch, but it is a deployment/configuration task

This should not be implemented by editing a Test key into a TypeScript file.
The current architecture already has the correct basic separation:

- `STRIPE_SECRET_KEY` is server-side;
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is client-side;
- `STRIPE_WEBHOOK_SECRET` is server-side;
- `APP_URL` controls Checkout redirects.

The production deployment must provide:

```text
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Live endpoint secret, not CLI/Test secret
APP_URL=https://your-real-domain.example
NEXT_PUBLIC_BASE_URL=https://your-real-domain.example
BETTER_AUTH_URL=https://your-real-domain.example
```

Live Products and Prices must also be created in Live mode. Test-mode IDs do
not become Live objects when keys are swapped. The complete procedure is in
[`test-to-live-stripe-migration.md`](./test-to-live-stripe-migration.md).

Do not switch the key while the production database still contains only Test
Customers and Test Subscriptions. Those IDs are not visible to the Live key.

### 3.2 Store Products and Prices in the database

#### Verdict: Good long-term idea; requires TypeScript and a data model change

The current source of plan configuration is
`client/constants/stripeConstants.ts`. It contains hard-coded Product and Price
IDs and an allowlist. This works for a small demo, but it becomes difficult to
operate when the business needs:

- monthly and yearly prices;
- multiple currencies;
- regional pricing;
- archived Prices;
- promotional Prices;
- display ordering;
- future plans without a code deployment.

This cannot be completed safely without TypeScript changes because it requires:

1. New database tables and migrations.
2. Server-side catalog queries.
3. A replacement for the hard-coded allowlist.
4. Server-side validation that a Price is active, recurring, and sellable.
5. Client query hooks and loading/error states.
6. Seed/import tooling for Stripe Products and Prices.

#### Recommended data model

Use the Stripe Price as the billing authority and the application database as
the application catalog/cache:

```text
product
  id
  stripeProductId
  name
  description
  active

price
  id
  productId
  stripePriceId
  tier                 # PRO or PREMIUM
  interval             # month or year
  currency
  unitAmount
  active
  isDefault
```

The checkout route should receive a local price record or a controlled lookup
key, then resolve and validate the Stripe Price on the server. The browser
must not be allowed to turn an arbitrary database row into an arbitrary Stripe
charge.

#### Important design choice

Do not treat the database amount as the final billing authority. Stripe owns
the amount actually charged. The database should mirror Stripe’s Price data
for display and selection, and synchronization should be explicit.

### 3.3 Use AWS Secrets Manager for application secrets

#### Verdict: Strong recommendation for production

The current `dotenv` approach is acceptable for local development, but real
production secrets should be stored in AWS Secrets Manager or an equivalent
secret-management system.

Good candidates include:

- Stripe secret key;
- Stripe webhook signing secret;
- Better Auth secret;
- OAuth client secrets;
- database connection string.

Keep public configuration separate:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not a secret;
- public application URL is not a secret;
- Stripe secret and webhook keys are secrets.

#### Recommended secret shape

Use one JSON secret per environment or a small set of purpose-specific
secrets, for example:

```json
{
  "STRIPE_SECRET_KEY": "sk_live_...",
  "STRIPE_WEBHOOK_SECRET": "whsec_...",
  "BETTER_AUTH_SECRET": "...",
  "DATABASE_URL": "..."
}
```

The exact grouping is an operational choice. Separating high-impact secrets
can reduce blast radius and make rotation easier.

#### Important Terraform warning

Do not put real secret values directly into Terraform configuration or ordinary
Terraform variables. Terraform state and plan output can retain sensitive
values. Store only secret metadata/ARNs in infrastructure code and inject the
values at runtime or deployment time.

### 3.4 Let EC2 use an IAM role and AWS SDK credentials

#### Verdict: Correct idea, with one important refinement

An EC2 instance should use an attached IAM role/instance profile rather than
long-lived AWS access keys stored on the machine. AWS documents that an EC2
instance profile supplies temporary role credentials to applications on the
instance.

The role should have only the permissions needed by this application, ideally:

```text
secretsmanager:GetSecretValue
secretsmanager:DescribeSecret
```

restricted to the exact production secret ARN. Add KMS decrypt permission only
if a customer-managed KMS key requires it.

#### How the application can receive secrets

There are two reasonable deployment patterns:

##### Pattern A: deployment/startup injection

1. EC2 uses its IAM role.
2. A deployment script or systemd/ container startup step reads the secret.
3. It creates the runtime environment for the Next.js process.
4. The application continues reading environment variables.

This avoids adding AWS SDK calls to application TypeScript and is the cleanest
fit for the current `envServer` design.

##### Pattern B: application startup retrieval

1. The application uses the AWS SDK Secrets Manager client.
2. The SDK uses the EC2 role through the default credential provider chain.
3. Secrets are fetched once during startup.
4. The values are validated before the server accepts traffic.

This requires TypeScript changes and careful startup/error handling. Secrets
should not be fetched on every request.

#### EC2 versus ECS consideration

If multiple unrelated containers share an EC2 instance role, they also share
its permissions. For a larger production system, ECS task roles or another
workload-specific identity can provide narrower permissions per service.

### 3.5 Apply Caddy

#### Verdict: Recommended; Caddy does not hinder Stripe payments

Caddy is a reverse proxy and TLS terminator. It does not interfere with Stripe
Checkout or the Stripe API as long as it forwards requests normally.

The intended topology is:

```text
Internet
   |
   v
Caddy :80/:443  -- HTTPS and domain certificate
   |
   v
Next.js app :3000 -- private/internal port
   |
   v
Managed PostgreSQL database
```

Caddy is particularly useful here because Live Stripe webhooks need a public
HTTPS endpoint. Caddy can automatically manage the domain certificate and
proxy `/api/stripe/webhook` to Next.js.

#### Caddy requirements

- Point DNS for the production domain to the EC2 public address/load balancer.
- Expose only ports 80 and 443 publicly.
- Keep the Next.js port private or bound only to localhost.
- Preserve POST methods and request bodies for webhook delivery.
- Do not rewrite the webhook path or consume the raw body before Next.js.
- Configure trusted proxy behavior if Cloudflare or another proxy sits in front
  of Caddy.
- Configure access/error logs without logging cookies, secrets, or full payment
  payloads.

A minimal shape would be:

```caddyfile
payments.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

This is an illustration, not a production-ready file for this project because
the domain, process supervisor, logging policy, and network layout are not yet
known.

Caddy’s [reverse proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
and [automatic HTTPS documentation](https://caddyserver.com/docs/automatic-https)
describe the relevant behavior.

### 3.6 Use Terraform for infrastructure as code

#### Verdict: Strong recommendation, but Terraform does not replace operations

Terraform is a good fit for repeatable AWS infrastructure. It can describe:

- VPC and subnets;
- security groups;
- EC2 instance and instance profile;
- IAM role and least-privilege policy;
- Secrets Manager secret metadata and access policy;
- Elastic IP or load balancer;
- DNS records;
- monitoring and alarms;
- backup and storage resources.

Terraform should not be used as a place to paste secret values. Its state can
contain sensitive values, so use a secure remote backend with encryption,
locking, restricted access, and backups.

Terraform also does not automatically solve:

- Stripe account activation;
- creating/approving live Products and Prices;
- deciding the billing catalog;
- application migrations;
- email-provider setup;
- incident response;
- deployment artifact promotion.

A sensible Terraform repository would have separate state/workspaces or
accounts for development, staging, and production. Avoid sharing a production
state file with local developers.

HashiCorp’s [state guidance](https://developer.hashicorp.com/terraform/language/state)
and [sensitive-data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
are important before putting secrets or infrastructure under Terraform.

### 3.7 Verify email/password user handling

#### Verdict: Server capability exists; the user-facing flow is incomplete

The project currently has:

- `emailAndPassword: { enabled: true }` in `server/lib/auth.ts`;
- `authClient.signUp.email(...)` in the sign-up form;
- an email/password form in the sign-in page;
- Better Auth database tables for users, accounts, sessions, and verification.

However, the sign-in form does not currently attach an `onSubmit` handler that
calls `signIn.email({ email, password })`. The “Continue with Email” button is
there, but the browser form does not complete the email/password sign-in flow.

The sign-up form calls signup but only logs `data` and `error`. It does not
provide a complete user-facing success/error state or a reliable redirect.

`server/actions/auth.action.ts` contains hard-coded demo credentials. Even if
the action is unused, it should not exist in a production build or repository.

`emailVerification: {}` alone is not a complete production email-verification
system. Better Auth’s [email documentation](https://better-auth.com/docs/concepts/email)
requires a mail-sending callback for verification and password-reset messages.

#### Required authentication decisions before launch

- wire email/password sign-in;
- show safe validation and error messages;
- configure email verification and require it where appropriate;
- configure password reset email delivery;
- set password length and rate-limit policies;
- revoke other sessions after security-sensitive password changes;
- add account recovery and support procedures;
- consider MFA/step-up authentication for billing actions.

These are TypeScript/application changes, so they are intentionally reviewed but
not implemented under the current “no TypeScript changes” constraint.

### 3.8 Decide what Caddy, Docker, and Compose should look like

#### Verdict: The current files are placeholders, so the app is not deploy-ready

`CaddyFile`, `DockerFile`, and `docker-compose.yml` are empty. A production
deployment needs explicit decisions for the following layers:

```text
Caddy
  public HTTPS, certificate, proxy, logs

Next.js container
  standalone build, port 3000, runtime environment

Secret injection
  EC2 IAM role -> Secrets Manager -> startup environment

Database
  preferably managed PostgreSQL, not an unprotected local Compose database

Stripe
  Live keys and Live webhook endpoint
```

#### Expected Docker shape

The Dockerfile should normally be a multi-stage build:

1. Install dependencies with the project’s package manager.
2. Build the Next.js standalone output.
3. Copy only the runtime output into a small production image.
4. Run as a non-root user.
5. Expose the internal app port.
6. Do not bake secrets into image layers.

#### Expected Compose shape on a single EC2 host

Compose could run:

- `app` on an internal network;
- `caddy` on ports 80/443;
- optionally a local database only for development.

For production, a managed database is usually preferable to adding a database
container without a backup, restore, upgrade, and storage strategy.

Compose secrets/environment wiring must not put the production Stripe secret in
the repository or image. The exact AWS-to-container injection mechanism is a
deployment decision and should be tested independently.

## 4. Recommended execution order

The notes should be executed in this order:

### Phase 0: Security and authentication gate

1. Complete the P0 items in
   [`stripe-production-security-audit.md`](./stripe-production-security-audit.md).
2. Fix email/password sign-in and user feedback.
3. Add email verification/password reset delivery.
4. Remove demo credentials, session-token display, debug API controls, and
   public product mutation routes.

### Phase 1: Deployment foundation

1. Decide EC2 versus ECS/App Runner before designing IAM around EC2.
2. Write Terraform for the chosen topology.
3. Create the IAM role and least-privilege Secrets Manager policy.
4. Define Docker image and process lifecycle.
5. Configure Caddy and HTTPS.
6. Add observability, backups, and rollback procedures.

### Phase 2: Catalog and billing configuration

1. Decide whether the database is a catalog mirror or the application’s plan
   management system.
2. Add monthly/yearly Price modeling through a TypeScript/database migration.
3. Create Test and staging catalog data.
4. Re-test Checkout, upgrades, scheduled cancellation, immediate cancellation,
   and webhook reconciliation.

### Phase 3: Live migration

1. Activate Stripe Live mode.
2. Create Live Products and Prices.
3. Create the Live webhook endpoint.
4. Inject Live secrets through the production secret manager.
5. Deploy the production image.
6. Run one controlled Live payment and verify the full lifecycle.

## 5. What can be done without TypeScript changes

These tasks can be prepared independently:

- create an AWS account/project structure;
- create IAM roles and policies;
- create a Secrets Manager secret and access controls;
- create Terraform infrastructure files;
- write and test a Dockerfile;
- write and test a Caddyfile;
- configure DNS, security groups, HTTPS, and deployment scripts;
- activate Stripe and create Live Products/Prices;
- create the Live webhook endpoint;
- maintain deployment/runbook documentation.

They still require real environment details, AWS access, a domain, and a
deployment decision. They cannot be completed safely from this repository by
guessing values.

## 6. What must wait for TypeScript/application work

These items should not be implemented as infrastructure-only changes:

- database-backed Products and Prices;
- monthly/yearly price selection in the UI;
- email/password sign-in;
- verification and password-reset flows;
- runtime AWS SDK secret retrieval inside the app;
- production authorization and rate-limit middleware;
- secure webhook event persistence and reconciliation.

Changing only credentials while leaving these gaps would make the deployment
live, but not production-ready.

## 7. Overall recommendation

The notes describe the right destination. The most important correction is the
order: authentication and security should be hardened before the Live key is
introduced, and deployment infrastructure should be defined before attempting
to run the app on EC2.

The next safe implementation milestone should be a staging environment that
uses Test-mode Stripe keys, a real HTTPS Caddy endpoint, the production-shaped
Docker image, AWS-managed secrets, and the same webhook topology intended for
Live mode. After that staging flow is reliable, switch only the environment,
catalog IDs, webhook secret, and Stripe mode for production.

