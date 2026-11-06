# Lease Loop

A circular leasing app for e-bikes, laptops and farm machines, built for the
Northfina × Hive Helsinki hackathon on 5–6 November 2026.

Browse an asset, choose lease terms, apply through a rules-based question flow and
manage simulated leases from your account. The interface supports English, Finnish,
Swedish and Estonian. All product decisions use rules, data and algorithms; there
are no AI, ML or LLM features inside the app.

## Quick start

You need Git, npm, Node.js **22** (the exact version is in [.nvmrc](.nvmrc)) and
GNU Make. macOS and Linux are supported; on Windows, use WSL. Make is optional:
the npm commands below provide the same workflow.

```bash
git clone https://github.com/Tiisetso/northfina-lease-loop.git
cd northfina-lease-loop
nvm install
nvm use
make setup
make dev
```

Open **http://localhost:3000**. The catalogue is public; register an account to
apply and view your leases. Stop the development server with **Ctrl+C**.

`make setup` runs `npm ci` followed by `RUST_LOG=info npm run db:setup`. It installs the locked
dependencies and Git hooks, generates the Prisma client, creates `.env` if missing,
generates a local authentication secret, applies migrations and seeds the 30 assets.
Existing environment values and database records are preserved. SQLite runs locally;
no separate database server or external service credentials are needed.

Without Make:

```bash
npm ci
RUST_LOG=info npm run db:setup
npm run dev
```

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

## Returns and second life

See [RECOVERY.md](RECOVERY.md) for customer returns, staff assessment access,
the valuation and settlement formulas, and publishing a second-life offer.

## Project decisions

Stop the running app before refreshing dependencies or database models.

```bash
make setup
make dev
```

If dependencies have not changed, `make db-setup` is enough to apply new migrations,
regenerate the client and add missing seed assets. The development command also
regenerates the Prisma client before starting Next.js.

## Local configuration

Setup creates the ignored `.env` file from [.env.example](.env.example).

| Variable             | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`       | Local SQLite file; defaults to `file:./dev.db`                |
| `BETTER_AUTH_URL`    | Exact application origin; defaults to `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Generated locally by setup; keep it private                   |

If you change the host or port, update `BETTER_AUTH_URL` to the same origin before
starting the app. Never commit `.env` or local database files. Use the same Node
version for installing dependencies and running the app because SQLite uses a native module.

The Makefile sets `RUST_LOG=info` for database setup because affected Prisma versions
can fail SQLite initialization when engine output is suppressed. This setting is
scoped to setup; it does not change the app's logging. When using npm directly,
use `RUST_LOG=info npm run db:setup`. See [the Prisma guide](PRISMA_GUIDE.md).

## Current application

- Catalogue and product pages with dated net prices, illustrative photos and lease sliders.
- Email/password accounts, protected customer data and account settings.
- Cart, conditional application questions, eligibility reasons and an approval gate.
- Simulated checkout with stored price snapshots.
- Lease dashboard with invoice forecasts, issued invoice/payment displays and management requests.

Checkout currently creates simulated leases. Return, buyout and exchange controls
submit requests; they do not yet fulfil those actions. Full contract signing,
regular invoice issuance and returned-item re-pricing/re-leasing remain work for the
required challenge loop. See [the challenge](CHALLENGE.md) for the full requirements.

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

Read [data/DATA.md](data/DATA.md) before using the data pack. Prices are integer
euro cents and exclude VAT unless stated otherwise. Personas, brands, the future
VAT change and CO₂ factors are fictional; product photographs are illustrative.

## Contributing

Follow [AGENTS.md](AGENTS.md) and [RULES.md](RULES.md). Keep business rules pure and
tested in `src/domain/`, use the shared API envelope, put every data change through
`withAudit()` and add interface strings in all four languages. Edit the Prisma schema
and use `make migrate` for database changes; never hand-write migration SQL.

Run `make check` before requesting review. It checks formatting, lint, types, file
size, no-AI rules, secret scanning, decision records, test coverage and the production build. Coverage
must reach 60% for lines, statements, functions and branches. GitHub CI additionally
validates commit messages. Use conventional commits such as
`feat(pricing): explain monthly rent`; keep Git hooks enabled.

Follow [CONTRIBUTING.md](CONTRIBUTING.md) for the commit and PR workflow. Start each
team PR with a plain-language summary of what changed and why it matters: 1–2 short
sentences, at most 50 words. Use the [team PR template](.github/pull_request_template.md)
in order; PR title, section structure and summary length are checked automatically.
Use CI for automated results and include useful local observations or visual evidence.
No manual checklist or checkbox signoff is required for team PRs. Keep the PR title
and any squash commit title conventional so the resulting history passes CI.
Meaningful choices follow the
[decision-record guide](docs/decisions/README.md); accepted choices appear in the
[generated decision log](docs/DECISIONS.md).

Further guides: [applications](APPLICATIONS.md), [authentication](AUTHENTICATION.md),
[lease dashboard](LEASE_DASHBOARD.md), [Prisma](PRISMA_GUIDE.md) and [UI/UX](UI_UX.md).

## Submitting

Enable GitHub Actions in the team fork and open the judging PR against
`etufillari/northfina-lease-loop` → `main` **before Friday 6 November 2026 at 16:00
Helsinki time**. The title must be `Team <name>: <your product name>`; use the
[hackathon submission template](.github/hackathon_submission.md).

Include the team members, at least two chosen Smart Problems, working scenario cards
and reproducible demo instructions. The latest commit of each open PR is recorded
at 16:00; later pushes are ignored and PRs opened after the deadline do not count.
Judging PRs are not merged. The pitch is four minutes followed by two minutes of Q&A.
Copying another team's work disqualifies both copies.

## License and help

The starter code and data pack use the [MIT license](LICENSE). Your team owns the
code it writes. Opening the judging PR permits Northfina to read and run that code
for judging and interviews; it does not grant permission to reuse or publish it
elsewhere without asking.

Ask mentors in the hackathon Discord's **#ask-a-mentor** channel. Follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
