# TeslaMarketplace Security Baseline

## Authentication
- Use secure password hashing (Argon2id or bcrypt with an appropriate work factor).
- Use short-lived sessions/access tokens and secure refresh-token rotation where applicable.
- Require re-authentication for sensitive owner actions.

## Authorization
- Enforce role-based access control on every protected API route.
- Customer accounts may access only their own profile, orders, payments, tracking events, and notifications.
- Owner/admin operations require explicit authorization and must never trust client-supplied roles.

## API and input security
- Validate request bodies, query parameters, identifiers, and state transitions server-side.
- Apply rate limiting to authentication, purchase, payment, and other abuse-sensitive endpoints.
- Use parameterized database queries/ORM APIs; never concatenate untrusted input into SQL.
- Return safe error messages without secrets, tokens, stack traces, or internal database details.
- Configure secure CORS, security headers, and HTTPS in deployment.

## Payments
- Do not store raw card numbers, CVV, or payment authentication secrets.
- Use a PCI-compliant payment processor and store only provider references/statuses needed for orders and reconciliation.
- Verify payment webhooks using provider signatures before changing order state.

## Data protection
- Encrypt secrets and credentials at rest and use environment/secret management rather than committing credentials.
- Minimize collection of personal data.
- Log security-relevant events without logging passwords, card data, access tokens, or other sensitive secrets.
- Encrypt database connections and backups in production.

## Audit and operational controls
- Record owner/admin actions affecting inventory, orders, payments, delivery, and monitor approvals.
- Make order and payment state transitions explicit and server-controlled.
- Maintain backups and a tested recovery procedure.
- Add dependency, secret, and code-security scanning to CI.

## Tesla information monitor
- Treat monitored public information as an untrusted external input.
- Never automatically convert monitored information into owned inventory.
- Require an owner approval action before monitored changes affect the catalog.
