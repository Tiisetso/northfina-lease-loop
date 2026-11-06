# Lease applications

The required Application step now sits between the cart and simulated checkout:

```text
cart → application questions → approved / rejected / manual review
                                   ↓ approved only
                         existing simulated checkout
```

An application is a rules-based eligibility result, not a signed contract, payment,
asset reservation, registry verification or real credit check. The existing checkout
still creates explicitly simulated leases. Contract signing remains a separate Spine step.

## Trying the flow

Use Node 22, run `npm ci` and `npm run db:setup`, then `npm run dev`. The database
setup applies the new `LeaseApplication` migration without resetting existing data.

1. Add an available item to the cart and choose its term and down payment.
2. Select **Continue to application**. Sign in or register if necessary; the form
   returns to the application afterward.
3. Complete the questions. Each has a translated explanation. Consumer/company,
   amount, asset-category and earlier-answer conditions come from `data/questions.json`.
4. Submit and review the persisted outcome and reasons. Approved applications can
   continue to simulated checkout; rejected/manual-review results cannot.
5. Changing the basket, term, down payment, price/version or quote day requires a
   matching new approval. Checkout always verifies this on the server, in its write
   transaction. A result belonging to another customer is never accepted.

Question answers stay in form memory until submission, not browser storage.
Submitted answers are stored only on the customer-owned application; hidden and
unknown answers are removed. Result pages display outcomes and quote items, not
sensitive answer fields. Audit entries record status/reason codes and item count,
not names, email addresses, birth dates or income. The result URL remains usable
by its owner after refresh. A future staff review interface is not implemented;
manual review currently records that a person is required and blocks checkout.

## Rules and explicit policies

- Consumers and sole traders must be 18 on the proposed start date, which is today
  in this initial flow. Feb 29 birthdays use Feb 28 in non-leap years as the demo's
  explicit age-calculation policy.
- Consumer/sole-trader residence must be FI, SE or EE. Businesses need a syntactically
  valid Finnish business ID with its correct check digit. This does not prove a
  business exists or that the applicant has verified signing authority.
- Consumer rent including VAT must be at most 30% of net income. Compare integer
  cents with exact integer arithmetic; equal to 30% is allowed. Money inputs are
  converted from decimal euros to integer cents without rounding; more than two
  decimal places are rejected.
- The entire cart's financed amount and monthly rent determine affordability and
  question thresholds. Category-targeted questions apply if any item matches that
  category; term thresholds use the longest selected term. Individual items must
  also be financeable and available. Combined finance must fit the supplied band limits.
- The supplied bank asks income only from €2,000 financed. Below that threshold,
  consumers are sent for manual review because affordability is unknown; cached
  answers to an inactive income question are not used to bypass this policy.
- PEP answers require manual review. A company applicant without signing authority
  must provide an authorized contact and receives manual review, not automatic approval.
- At €50,000 financed or more, require a person to review the business due diligence.
  This implements the challenge's large-tractor scenario; it is an explicit demo policy.
- Missing/invalid answers produce a validation response, not approval. Rejection
  takes precedence over manual-review triggers. Expected eligibility failures are
  values with stable translated reason codes, never raw exceptions to the customer.

Business ID check digits follow the [Finnish Tax Administration specification](https://www.vero.fi/globalassets/tietoa-verohallinnosta/ohjelmistokehittajille/finnish-tax-administration_the-control-character-for-verifying-the-authenticity-of-finnish-business-ids-and-personal-identity-codes.pdf).
The bank's free-text eligibility explanations are documentation; policy code and
its tests implement the rules explicitly. Changing eligibility policies requires
reviewing the domain implementation and tests rather than interpreting prose at runtime.

## Boundaries and verification

`POST /api/applications` requires a session, same-origin JSON and a bounded request
body. It accepts only item selections and answers; identity, prices, thresholds and
outcome are server-derived. Every saved application and its audit row use the same
`withAudit()` transaction. Incomplete requests are not persisted. No assets,
contracts, invoices or payments are changed by applying.

`POST /api/checkout` now requires `applicationId`. Owner, approval status, quote date
and canonical quote items are checked again inside the checkout transaction. The
client cannot replace that check with an approval boolean. Reloading a result or
reading identity does not write data.

Domain tests cover age/calendar boundaries, business ID checks, question branching,
pruning, combined affordability, exact limits and manual-review policies. Integration
tests cover sessions, CSRF, size limits, forged identity, owner isolation, quote
changes, unavailable items, result persistence and audit rollback. The question bank's
option labels and explanations are tested across en/fi/sv/et.

Run `npm run check:all` before requesting review. Do not put real personal details
in fixtures, screenshots, audit entries or PR descriptions.
