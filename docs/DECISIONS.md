# Project decisions

Generated from reviewed decision records and merge metadata. Do not edit this table manually.
See [the decision-log guide](decisions/README.md) for the contribution and publication workflow.

<!-- prettier-ignore -->
| Decision ID | Date | Category | Decision |
|-------------|------|----------|----------|
| [D-7-01](https://github.com/Tiisetso/northfina-lease-loop/pull/7) | 2026-11-05 | Auth | Derive customer ownership and audit actors from verified server sessions so browser&#45;supplied identifiers cannot authorize access&#46; |
| [D-7-02](https://github.com/Tiisetso/northfina-lease-loop/pull/7) | 2026-11-05 | Database | Commit authentication writes and their audit entry in one transaction so an audit failure rolls back the identity change&#46; |
| [D-11-01](https://github.com/Tiisetso/northfina-lease-loop/pull/11) | 2026-11-05 | Contract | Display stored VAT snapshots for issued invoices and treat future bills as forecasts so tax changes do not recalculate invoices already issued&#46; |
| [D-11-02](https://github.com/Tiisetso/northfina-lease-loop/pull/11) | 2026-11-05 | Contract | Treat return&#44; buyout and exchange actions as requests for review so submission alone leaves the current contract and asset unchanged&#46; |
| [D-16-01](https://github.com/Tiisetso/northfina-lease-loop/pull/16) | 2026-11-05 | API | Recalculate checkout amounts from server&#45;loaded pricing data and reject changed quotes so client&#45;supplied totals are not authoritative&#46; |
| [D-16-02](https://github.com/Tiisetso/northfina-lease-loop/pull/16) | 2026-11-05 | UI | Group future payment forecasts into periods of identical amounts so the dashboard shows the next forecast and each price change instead of repeating every month&#46; |
| [D-26-01](https://github.com/Tiisetso/northfina-lease-loop/pull/26) | 2026-11-06 | Process | Review one structured decision record alongside each implementation so the accepted wording is preserved without parallel PRs editing a shared table&#46; |
| [D-26-02](https://github.com/Tiisetso/northfina-lease-loop/pull/26) | 2026-11-06 | Infrastructure | Publish generated decision history through one rolling documentation PR because main requires PRs and prohibits direct bot writes&#46; |
| [D-37-01](https://github.com/Tiisetso/northfina-lease-loop/pull/37) | 2026-11-06 | API | Require a server&#45;evaluated application approval for the same customer&#44; cart and quote date before simulated checkout so clients cannot bypass eligibility with a flag or another customer&#39;s result&#46; |
| [D-37-02](https://github.com/Tiisetso/northfina-lease-loop/pull/37) | 2026-11-06 | Contract | Evaluate consumer affordability and due&#45;diligence thresholds across the entire cart so splitting items cannot hide the applicant&#39;s combined monthly commitment&#46; |
| [D-37-03](https://github.com/Tiisetso/northfina-lease-loop/pull/37) | 2026-11-06 | Process | Route applications to manual review when the question bank omits the income answer needed for affordability rather than silently assuming the applicant can afford the lease&#46; |
| [D-42-01](https://github.com/Tiisetso/northfina-lease-loop/pull/42) | 2026-11-06 | Process | Require a brief plain&#45;language summary before the detailed team PR template and share the commit and PR workflow through CONTRIBUTING&#46;md so teammates and coding agents can quickly understand and review changes&#46; |
| [D-58-01](https://github.com/Tiisetso/northfina-lease-loop/pull/58) | 2026-11-06 | Process | Validate objective team PR metadata and repository checks in CI and remove manual attestation checklists so authors provide useful context without duplicating automated results&#46; |
| [D-58-02](https://github.com/Tiisetso/northfina-lease-loop/pull/58) | 2026-11-06 | Infrastructure | Run the existing secret scanner over tracked files in both CI and the full local check suite so detection does not depend only on a local pre&#45;commit hook&#46; |
