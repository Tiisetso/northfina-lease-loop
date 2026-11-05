# Account foundation

This branch provides identity and ownership for the future leasing dashboard.
It does not implement contracts, invoices, exchanges, payments or rewards.

## Implementation plan

1. Add User, AuthIdentity, AuthSession, AuthVerification and AuthRateLimit models
   for Better Auth, plus a Customer owned by one user. Generate the migration
   with Prisma; preserve existing assets and audit rows.
2. Configure email/password authentication, server-side sessions, explicit trusted
   origin, secure production cookies, throttling and short-lived sessions.
   Keep credentials and session tokens out of application responses and audit details.
3. Expose only the supported authentication operations through the existing API
   envelope. Run all authentication writes and their audit row in one transaction.
   Reads must not silently refresh or delete sessions outside that transaction.
4. Add translated registration/login and a protected account screen, profile name
   editing, password change, logout and logout on every device.
5. Derive identity and customer ownership from the verified session on the server.
   Existing inventory mutation and global audit routes require staff access.
6. Test authentication, session expiry/revocation, customer isolation, forged input,
   CSRF, throttling and rollback when auditing fails. Run `npm run check:all`.

## Ownership contract for future features

- User identifies a login; Customer identifies the leasing party. A newly registered
  user owns a new private customer record, never a pre-existing data-pack persona.
- Future contracts, applications and rewards should reference Customer.id.
- Obtain the customer ID using the server authentication helper. Never accept a
  request's customer ID or actor as evidence of ownership.
- Signing authority for a company and financing eligibility are separate business
  decisions. Registration grants neither. Company membership is a later feature.
- Public registration cannot assign staff privileges. Staff provisioning must happen
  through a trusted administrative process; no public role-changing endpoint exists.

## Scope and deployment

The initial local workflow supports email/password registration without sending mail.
An email address is therefore a login identifier, not verified proof of identity.
Do not use email matching to claim existing customers, invite users to companies or
approve leases. Before public production onboarding, add email verification and a
time-limited, single-use recovery workflow through a configured email provider.

Set BETTER_AUTH_URL to the application's exact origin and provide a random
BETTER_AUTH_SECRET of at least 32 characters. Use HTTPS in production. Do not trust
forwarded client IP headers unless a trusted deployment proxy overwrites them.

The auth library's schema is generated through Prisma migrations. Its request
handlers are deliberately not mounted as an unrestricted catch-all: only reviewed
operations are exposed. Every write uses the transaction supplied by withAudit().

Source references: [Better Auth security](https://www.better-auth.com/docs/reference/security),
[Next.js authentication](https://nextjs.org/docs/app/guides/authentication).
