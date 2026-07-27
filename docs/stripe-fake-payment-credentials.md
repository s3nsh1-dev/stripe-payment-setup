Sure — the classic one is:

**Card number:** `4242 4242 4242 4242`
**Expiry:** any future date (e.g. `12/34`)
**CVC:** any 3 digits (e.g. `123`)
**ZIP/postal:** any valid-format value (e.g. `12345`)

That's a generic successful Visa test card. A few other useful ones for testing different scenarios:

| Scenario                          | Card number           |
| --------------------------------- | --------------------- |
| Successful payment                | `4242 4242 4242 4242` |
| Payment declined                  | `4000 0000 0000 0002` |
| Requires 3D Secure authentication | `4000 0025 0000 3155` |
| Insufficient funds                | `4000 0000 0000 9995` |

These only work in **Test mode / Sandbox** — same rule as before, make sure you're using the sandbox's test key when hitting checkout, or the card will just get rejected as invalid (since Stripe checks whether you're even in a testable environment).

If you ever forget these, they're all listed at `docs.stripe.com/testing` under "Test card numbers" — worth bookmarking since you'll reference it a lot during development.
