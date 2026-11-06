# Lease Loop

**Team 4 · Northfina × Hive Helsinki hackathon, 5–6 November 2026**

Lease Loop lets one e-bike, laptop or farm machine live several lives: browse, price,
apply, sign, pay monthly, then buy it, return it or exchange it, and the returned item is
inspected, refurbished, re-priced and leased to the next person. Every decision is made by
rules, data and algorithms, with no AI, ML or LLM features in the app. The interface is in
English, Finnish, Swedish and Estonian.

This README is our submission document: what we built against the
[challenge](CHALLENGE.md), how it works, and how to run it. To present the scenario cards,
follow **[DEMO_TIPS.md](DEMO_TIPS.md)**.

## Team

| Name | GitHub | Main focus |
| ---- | ------ | ---------- |
| TODO | TODO   | TODO       |

## The Spine

| #   | Step            | Status | What we built                                                                                                                                                                                                                                                                                  |
| --- | --------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Catalogue**   | ✅     | All assets with today's price including VAT, from the dated price lists (`listPriceOn`). Reserved and returned items are labelled; returned items come back with a second-life price.                                                                                                          |
| 2   | **Price**       | ✅     | Product-page sliders for term and down payment update the monthly rent live from the coefficient bands (`monthlyFactorFor`, `quoteAmounts`). Amounts outside the bands are explained, not hidden.                                                                                              |
| 3   | **Application** | ✅     | The `questions.json` question engine gives yes, no or "a person will check", always with reasons (see Smart Problem 4).                                                                                                                                                                        |
| 4   | **Contract**    | ✅     | Signing locks the price list of the signing day and stores the list price, rent, buyout, interest rate and price-list version; later price lists never touch it. A price that differs from the quote is shown and must be accepted (card 2). A company contract waits for its named signatory. |
| 5   | **Invoices**    | ✅     | Each month's invoice is issued on its due date from the locked contract (`invoicesDue`): net rent, VAT at the rate on that due date stored on the invoice, due dates clamped to month end. Billing runs idempotently when the customer opens their account, with an audit row.                 |
| 6   | **End of term** | ✅     | **Buy** (self-service, priced and paid in one step), **return** (guided condition check, then staff inspection) or **exchange** for another item, which passes the old one on to its next life. Co-leasing splits invoices between participants.                                               |
| 7   | **Second life** | ✅     | Staff inspect a returned item, sign off the refurbishment, see the new price (original price × age × condition × usage from `residual-curves.json`, minus the work) and put it back in the catalogue, where it can be leased again.                                                            |

## Smart Problems

We chose **4 (smart question flow)**, **1 (lock the price, not the tax)** and **2 (fair
early exit)**, also solved **3 (second-life matchmaking)** and **5 (money that adds up)**, and went part of the way on 6 and 7.

### 🧠 4. The smart question flow ✅

- **Ask only what's needed.** `applicationQuestions` (`src/domain/application.ts`) walks
  the ordered bank once and evaluates each `ask_when` condition (customer type, category,
  financed amount, term, earlier answers) against the **whole cart**, so splitting a cart
  can't avoid a threshold.
- **Changing an answer.** Answers to questions that no longer apply are pruned in the same
  pass, before later conditions read them, so a stale answer can never affect the result.
- **Why we ask** is shown for every question in all four languages.
- **Clear outcomes with reasons**: approved, rejected or manual review, as stable reason
  codes with plain, kind explanations. Highlights:
  - the Finnish business-ID check digit is verified (`validBusinessId`);
  - the consumer affordability rule (rent incl. VAT ≤ 30 % of net income) applies only
    when the bank asks for income, from €2,000 financed;
  - a PEP, or €50,000 or more financed, always goes to a person;
  - an applicant who **can't sign** for their company names who can, and the contract
    waits for that person, who signs by link (card 6, `src/domain/signatory.ts`);
  - an applicant **under 18** gets a gentle explanation, the date they can apply and a
    ready-written email to a parent or guardian (card 5).

### 🧾 1. Lock the price, not the tax ✅

- The contract stores the **net** rent. VAT is looked up for each invoice's **due date**
  (`forecastInvoices` in `src/domain/lease-billing.ts`) and rounded once per invoice, half
  up, in integer cents. An issued invoice keeps its VAT snapshot (`vatBasisPoints`,
  `vatCents`), so a later rate change never rewrites it.
- The 26 % rate from 1 January 2027 therefore changes the total of the January invoice
  while the net rent stays the same. The lease page groups upcoming payments into periods
  of equal amounts (`forecastPaymentChanges`), so the change is visible as its own line,
  labelled "VAT 25.5 %" → "VAT 26 %", with a note that the net rent is locked.

### 🚪 2. Fair early exit ✅

`settlementQuote` (`src/domain/lease-settlement.ts`) prices both ways out from the same
inputs, in exact rational arithmetic, rounded once:

- **Buyout** = present value of the remaining rent at the contract's own monthly rate +
  present value of the end-of-term buyout, plus VAT once, plus any unpaid invoices. Paying
  early costs less than paying monthly, and in the final month it equals the normal buyout.
- **Early return** = the smaller of the remaining rent and what's still owed after the
  item's market value (`residual-curves.json`) is credited, with repair damage as a floor.
  A well-kept item returned early costs little; a worn one costs more.
- The buyout and return pages show the formula and every amount (`PriceFormula`).

### 💶 5. Money that adds up ✅

Integer euro cents everywhere, with `BigInt` arithmetic and one documented rounding rule:
every amount (rent, VAT per invoice, buyout, settlements) is rounded **once**, to the
nearest cent, half up. The first month is a full month from the start date (no pro-rata),
and due dates keep the start day, clamped to the month's end (31 Jan → 28 Feb 2026 → … →
29 Feb 2028). The product page tells customers the rule.

**Property-based tests** (`src/domain/money.property.test.ts`, fast-check) check
thousands of random contracts on every run: any financed amount, term, and start date
(including the 29th–31st and leap years). For every one:

- each invoice is whole non-negative cents, with VAT within half a cent of exact;
- net invoices sum exactly to rent × term, and the quoted total to the invoices;
- due dates rise one calendar month at a time, clamped to the month end;
- billing month by month gives exactly the invoices of one catch-up run, never duplicates;
- paying off early never costs more than paying monthly, and equals the buyout at the end.

### 🔍 6. Explain my price ⚠️ partly

As the sliders move, the product page shows the down payment, the financed amount and the
monthly payment including VAT, and the buyout and return pages show their formula with
every term. **Not yet:** a side-by-side comparison of terms (#56).

### 🌍 7. Circular impact ⚠️ partly

Each reused item's lease page shows the CO₂ avoided by not making a new one, reduced for
worse condition (`reuseEstimate`, fictional factors from `co2-factors.json`). **Not yet:**
fleet-wide totals.

### ♻️ 3. Second-life matchmaking ✅

On a returned item's staff page (card 9, `src/domain/second-life.ts`):

- **Refurbish or not** (`refurbishDecision`): yes when the item can be leased again and its
  price after the work (residual curves) is more than the work costs (refurbishment costs).
  `ebike-007`: worth €1,866.60 after €670.00 of work, so refurbish.
- **Who gets it** (`matchWaitingList`): someone qualifies when the item meets their minimum
  condition (after the work), the net rent at **their preferred term** fits their budget, the
  term is financeable and their deadline hasn't passed. **Tie-break:** the earliest
  needed-by date wins; on the same date, whoever signed up first wins (list order). Every
  candidate shows the rent and the check they failed.
- **Card 9 answer:** `wait-13` gets it, 24 months at €68.39 a month excl. VAT. `wait-02` has
  the same budget and deadline but wants 12 months, which makes the rent €104.57, over
  their €90.00. `wait-04` also qualifies but needs it later.
- **Item passport** (`itemPassport`, bonus, card 10): the product page of a used item lists
  every life (dates, term, starting condition, outcome; never who leased it), including
  lives before our records, and the CO₂ avoided: for each life after the first, the
  manufacturing CO₂ minus the refurbishment share, scaled by the condition it started in.

**Not yet:** assigning the item to the winner from the panel (staff publish it and the
person leases it from the catalogue).

## Wildcards

- **Time travel and personas for demos.** A demo bar sets the date the whole app treats as
  today and signs in as any of the ten data-pack personas, each starting at their
  scenario card (Aino already has her bike; Mikko, Norvi and Haapala have their item in
  the cart). Both are audited and off in production unless `LEASE_LOOP_DEMO=true`.
- **Signing by link** for a company's authorised signatory, with no account needed.
- **Co-lease:** share a lease and split its invoices between participants.
- **Staff workspace:** returns queue, inspection, refurbishment sign-off and relisting,
  plus an overview with 24 months of simulated history (revenue and active leases).

## Scenario cards

| Card | Scenario         | Status | Card              | Status |
| ---- | ---------------- | ------ | ----------------- | ------ |
| 1    | Happy path       | ✅     | 6 · Who can sign? | ✅     |
| 2    | The price lock   | ✅     | 7 · Big ticket    | ✅     |
| 3    | Tax is not price | ✅     | 8 · Early exit    | ✅     |
| 4    | Calendar traps   | ✅     | 9 · Second life   | ✅     |
| 5    | Too young        | ✅     | 10 · Third life   | ✅     |

Step-by-step instructions, what to point out and the exact gaps: [DEMO_TIPS.md](DEMO_TIPS.md).

## Engineering

- **Pure, tested domain logic** in `src/domain/`: no I/O, no clock; dates are arguments.
  Vitest tests sit next to every module (492 tests at the last run; coverage gate 60 %,
  currently above 90 % for lines).
- **Money** in integer cents with one deliberate rounding step per amount.
- **One API envelope**: `ok()` / `fail()` / `handleRoute()`; no raw errors reach the browser.
- **Audit trail**: every data change goes through `withAudit()` in the same transaction,
  including demo actions and signatures (the signatory is the actor).
- **Guards**: hooks (secret scan, Prettier, ESLint, conventional commits, pre-push tests),
  CI on every PR (format, lint, types, file size, no-AI, secrets, decision records,
  coverage, build, PR description), files under 600 lines.
- **Decisions** are recorded with each PR and published in [docs/DECISIONS.md](docs/DECISIONS.md).

## Run it

You need Git, npm, Node.js **22** (the exact version is in [.nvmrc](.nvmrc)) and GNU Make
(optional). macOS and Linux are supported; on Windows, use WSL.

```bash
git clone https://github.com/Tiisetso/northfina-lease-loop.git
cd northfina-lease-loop
nvm install && nvm use
make setup   # or: npm ci && RUST_LOG=info npm run db:setup
make dev     # or: npm run dev
```

Open **http://localhost:3000**. Setup installs the locked dependencies and Git hooks,
creates `.env` with a local auth secret, applies migrations and seeds the 30 assets plus
simulated history. SQLite runs locally; no external services or credentials are needed.

**Then:** use the dark demo bar to pick a date and a persona (see
[DEMO_TIPS.md](DEMO_TIPS.md)). `npm run db:reset` returns to a fresh database.

**Test it:** `make check` (or `npm run check:all`) runs everything CI runs. `make test`
runs the tests once, `make coverage` adds the coverage report.

### Demo mode

In demo mode (on by default outside production) the bar above the header has two
controls. **Demo date** makes the whole app treat a date from 2026-01-01 to 2031-12-31 as
today. **Act as** signs in as one of the ten personas in `data/customers.json` or as
_Staff (demo)_: an account is created on first use, its password is derived from
`BETTER_AUTH_SECRET` (never stored or shared), and the application form starts with the
answers the persona's record can give. `LEASE_LOOP_DEMO=false` turns demo mode off;
`LEASE_LOOP_DEMO=true` allows it in a production build.

### Local configuration

Setup creates the ignored `.env` file from [.env.example](.env.example).

| Variable             | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`       | Local SQLite file; defaults to `file:./dev.db`                |
| `BETTER_AUTH_URL`    | Exact application origin; defaults to `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Generated locally by setup; keep it private                   |
| `LEASE_LOOP_DEMO`    | Optional: `true`/`false` forces demo mode on/off              |

If you change the host or port, update `BETTER_AUTH_URL` to the same origin. Use the same
Node version for installing and running, because SQLite uses a native module. The Makefile
sets `RUST_LOG=info` for database setup because affected Prisma versions can fail SQLite
initialization otherwise; see [the Prisma guide](PRISMA_GUIDE.md).

## Everyday commands

Run `make` or `make help` to list the available commands.

| Task                                             | Make                                         | npm equivalent                                          |
| ------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------- |
| First setup or refresh dependencies and database | `make setup`                                 | `npm ci && RUST_LOG=info npm run db:setup`              |
| Start development                                | `make dev` or `make run`                     | `npm run dev`                                           |
| Run all local checks                             | `make check`                                 | `npm run check:all`                                     |
| Run tests once                                   | `make test`                                  | `npm test`                                              |
| Watch tests                                      | `make test-watch`                            | `npm run test:watch`                                    |
| Tests with coverage                              | `make coverage`                              | `npm run test:coverage`                                 |
| Lint                                             | `make lint`                                  | `npm run lint`                                          |
| Format files                                     | `make format`                                | `npm run format`                                        |
| Check types                                      | `make typecheck`                             | `npm run typecheck`                                     |
| Build for production                             | `make build`                                 | `npm run build`                                         |
| Serve a production build                         | `make start`                                 | `npm run start`                                         |
| Apply migrations and add missing seed assets     | `make db-setup`                              | `RUST_LOG=info npm run db:setup`                        |
| Seed an initialized database                     | `make db-seed`                               | `npm run db:seed`                                       |
| Create a migration after editing the schema      | `make migrate ARGS="--name describe_change"` | `npm run db:migrate -- --name describe_change`          |
| Browse the database                              | `make studio`                                | `npm run db:studio`                                     |
| Remove generated caches                          | `make clean`                                 | Remove `.next/`, `coverage/` and `tsconfig.tsbuildinfo` |

`make clean` keeps `.env`, the database and installed dependencies. All command
targets are phony, so files with matching names cannot prevent them from running.

Pass extra CLI options through `ARGS` on development, build, start, test and migration
commands, for example:

```bash
make test ARGS="src/domain/pricing.test.ts"
make build ARGS=--webpack
```

The Webpack option is useful in environments that block Turbopack's internal worker
ports. `make check` always runs the unchanged `check:all` script and its default build.

## Project structure

| Location          | Responsibility                                                  |
| ----------------- | --------------------------------------------------------------- |
| `src/app/`        | Next.js pages and API routes                                    |
| `src/components/` | Shared interface components                                     |
| `src/domain/`     | Pure business rules and adjacent Vitest tests                   |
| `src/server/`     | Authentication, persistence, audit transactions and API helpers |
| `src/data/`       | Typed data loaders, schemas and photo credits                   |
| `src/i18n/`       | Formatting and en/fi/sv/et messages                             |
| `prisma/`         | Database schema, generated migrations and seed entry point      |
| `data/`           | Synthetic assets, prices, questions and other challenge inputs  |
| `scripts/`        | Quality checks, local setup and decision-log tooling            |

Read [data/DATA.md](data/DATA.md) before using the data pack. Prices are integer euro
cents and exclude VAT unless stated otherwise. Personas, brands, the 2027 VAT change and
CO₂ factors are fictional; product photographs are illustrative.

More detail: [applications](APPLICATIONS.md), [returns and second life](RECOVERY.md),
[lease dashboard](LEASE_DASHBOARD.md), [authentication](AUTHENTICATION.md),
[Prisma](PRISMA_GUIDE.md) and [UI/UX](UI_UX.md).

## Contributing

Follow [AGENTS.md](AGENTS.md), [RULES.md](RULES.md) and [CONTRIBUTING.md](CONTRIBUTING.md):
pure tested rules in `src/domain/`, the shared API envelope, `withAudit()` for every data
change, strings in all four languages, `make migrate` for schema changes (never hand-written
SQL), conventional commits with hooks enabled, and the [team PR template](.github/pull_request_template.md).
Meaningful choices follow the [decision-record guide](docs/decisions/README.md).

## Submitting

Enable GitHub Actions in the team fork and open the judging PR against
`etufillari/northfina-lease-loop` → `main` **before Friday 6 November 2026 at 16:00
Helsinki time**. The title must be `Team <name>: <your product name>`; use the
[hackathon submission template](.github/hackathon_submission.md). The latest commit of
each open PR is recorded at 16:00; later pushes are ignored. Judging PRs are not merged.

## License and help

The starter code and data pack use the [MIT license](LICENSE). Your team owns the code it
writes. Opening the judging PR permits Northfina to read and run that code for judging and
interviews; it does not grant permission to reuse or publish it elsewhere without asking.
Ask mentors in the hackathon Discord's **#ask-a-mentor** channel. Follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
