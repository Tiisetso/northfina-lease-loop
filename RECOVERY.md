# Returns, assessment and second-life offers

The customer journey is **My leases → open lease → Return item → report → staff quote → customer accepts → staff receives → work completed → second-life catalogue offer**.

## Staff access

Staff pages are at `/en/staff/returns` (also fi/sv/et). Both pages and mutation APIs check the signed-in staff role. A staff link appears in the account menu only for staff. Customers cannot assign themselves a role through the application.

For local development, grant an existing account access:

```bash
npm run staff:grant -- your-email@example.com
```

If your local database contains exactly one account, `npm run staff:grant -- --only-local-user` selects it. Provisioning is audited and refuses production mode. This is a local command, not a web endpoint or password bypass.

## Reports and assessment

Reports collect condition, lifetime usage, relevant faults, missing accessories, notes and a preferred return date. Laptops include screen, keyboard and battery issues; bikes include brakes, tyres, battery and drive; farm machinery includes engine, hydraulic and service issues.

A report is not an inspection. Staff confirm condition, lifetime reading, age and target condition and quote additional repairs not covered by the supplied tables. Inspection notes must describe the planned work. The saved quote contains the inputs, age/original-price baseline, tax and finance rate, line-item work costs, outputs and policy versions. Customer responses omit private inspector notes and identity.

For legacy assets missing the original price/date, the earliest recorded contract supplies the price baseline and staff document age. This is an estimate, not proof of the original new-item value. New contracts preserve the original baseline and financing rate; a later lease never restarts the item's age.

## Versioned demo formulas

All internal money is integer net euro cents; customer amounts include applicable VAT. This is an explicit simulated commercial policy, not a claim of regulatory or accounting compliance.

### Recovery policy `recovery-v1`

- Age factor: linearly interpolate the category points in `data/residual-curves.json`; hold the last point after the curve ends.
- Usage factor: apply the category penalty per completed usage step, capped by the table's maximum reduction.
- Value: original first-lease net price × age factor × condition multiplier × usage factor. Preserve exact intermediate fractions and round the final valuation half up to one cent.
- Refurbishment cost: chained condition improvements + mandatory safety/data-wipe tasks + triggered battery/service tasks + the professional's additional repair quote.
- Net recovery: post-repair estimated value minus refurbishment cost. Work expense is kept separate; spending money on a repair does not automatically increase market value by the same amount.
- Published second-life net price: the post-repair value. The same quote engine, eligibility checks and VAT rules apply when it is leased again.
- Lifetime usage never resets. A completed battery replacement or major service advances a separate maintenance baseline, avoiding charging for the same service repeatedly.

The professional confirms every required task and reported fault has been dealt with before publication. If recovery is unsuitable, a received item can be retired instead. An economic loss is visible rather than hidden; the decision to proceed remains a staff decision. Waiting-list matchmaking is not implemented in this workflow.

### Settlement policy `settlement-v1`

Let `M` be locked monthly net rent, `B` the contractual net buyout, `n` future unissued payment periods and `r` the snapshotted nominal annual rate divided by 12. Issued payments are excluded from that future balance; unpaid issued invoices and past unissued accrued rent are added once, separately, as gross balances.

```text
remaining rent value = sum(M / (1 + r)^k), k = 1..n
buyout net = remaining rent value + B / (1 + r)^n
early return net = min(remaining rent value, max(0, buyout net - net recovery))
```

At the agreed end (`n = 0`), ordinary return settlement is zero and buyout is `B`, before arrears and VAT. Early return is capped at the discounted remaining rents so the provider retains residual-value risk. No arbitrary administration fee or second damage charge is added. The same damage must not reduce recovery value and also create an unitemized duplicate charge.

Discounting uses integer rational arithmetic; round each final net quote half up to cents. Apply the quote-date standard VAT policy once and then add already-gross outstanding issued invoices and past accrued unissued rent once. Real settlement tax treatment would need a separate reviewed policy. Existing contracts without a saved finance rate explicitly use the current coefficient table as a legacy fallback, recorded in the quote.

A quote expires at the end of its quote date. Customer acceptance must match its exact assessment version. Once accepted, the settlement snapshot is frozen for subsequent physical receipt. The simulated buyout action changes ownership status without claiming a recorded payment; non-demo contracts require a recorded settlement-payment integration first.

## Lifecycle and data guarantees

- A request alone leaves the lease active.
- Staff assessment produces a quote, not a physical return or completed repair.
- Customer acceptance does not mark the item received.
- Physical receipt closes the original lease and increments prior lives once, while keeping its financial snapshot.
- Received and retired items stay unavailable. Publication requires explicit completion confirmation and creates an assessed offer revision.
- Catalogue and checkout use that offer rather than falling back to the original new-item list price.
- Checkout reserves the physical item and locks the new agreement values. An idempotent retry returns the existing lease instead of creating another one.
- Every transition uses `withAudit()` in one transaction, including role and ownership checks. Conflicting active leases block receipt.

Calculations live in `src/domain/asset-recovery.ts`, `lease-settlement.ts`, `asset-offer.ts` and existing billing functions. Server services load data, check authorization and save snapshots; the UI presents the results rather than trusting browser-supplied amounts.
