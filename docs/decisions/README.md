# Project decision log

[Read accepted decisions](../DECISIONS.md). The central table is generated; never
edit it manually. This is a lightweight, MADR-inspired record of meaningful choices
and their reasons, reviewed alongside the implementation. No model or LLM runs in
publication: agents draft records during development and reviewers accept the words.

## Contribute a decision

A PR can have zero decisions. Typos, routine dependency updates and straightforward
fixes do not need a record unless they introduce a meaningful choice.

For a meaningful choice, add **one** uniquely named JSON file under
`docs/decisions/records/`, using a descriptive lowercase hyphenated filename.
The name does not require a PR number. Use this shape (example only, not history):

```json
{
  "schemaVersion": 1,
  "decisions": [
    {
      "category": "Process",
      "decision": "Keep reviewed decision inputs separate from generated output so parallel PRs do not edit a shared table."
    }
  ]
}
```

Write each decision as one concise sentence stating the choice and its real reason.
Do not invent an approval, rationale or alternative. The ordered array assigns
numbers starting at 1 within the PR. Do not add IDs, PR numbers or dates yourself.
During review, edit this PR's new record as needed. After merging, it is immutable,
even while its publication PR is pending. One new record per PR is the maximum;
an empty decision list is invalid. PRs with no record remain valid.

The single allowed-category list is `CATEGORIES` in `scripts/decisions/model.mjs`:

| Category       | Meaning in Lease Loop                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| UI             | User experience, layout and interaction choices                                                                    |
| Contract       | Leasing business agreements: price locks, lease terms, buyouts and customer/lessor obligations; not API interfaces |
| API            | HTTP boundaries, request/response interfaces and API contracts                                                     |
| Database       | Persistence, schemas and transactional data choices                                                                |
| Auth           | Identity, sessions, authorization and ownership                                                                    |
| Infrastructure | Hosting, build and operational choices                                                                             |
| Testing        | Verification strategy and test tooling                                                                             |
| Process        | Team workflow, review and documentation policy                                                                     |

Use one primary category. To introduce another category, update `CATEGORIES`, its
tests and this guide together in a reviewed PR; do not insert ad hoc categories.

## IDs, dates and historical integrity

An accepted record produces IDs `D-<PR number>-<decision number>`, for example
`D-21-01` and `D-21-100`. The PR number is never padded. Every ID links to the
original PR. Dates are the PR's actual merge date in UTC, not the record date or
publication date. The full UTC timestamp is stored in `index.json` and determines
ordering, followed by PR number and ordered decision number.

`index.json` is generated durable metadata: it contains the source filename,
SHA-256 digest, original PR number/URL, merge timestamp, assigned IDs and reviewed
decision snapshots. Together with the source files it can rebuild the entire table.
Retries must reproduce those original associations rather than assigning decisions
to the later repair or publication PR.

Never rewrite or renumber historical decisions. Supersede a choice with a new PR
and new record whose sentence explicitly references the old ID. Both rows remain.
For a historical wording mistake, use that same reviewed superseding-record process;
there is no silent-edit exception. For damaged generated files, a maintainer can
reconcile and open a repair PR containing only the regenerated outputs. The repair
must reproduce original GitHub metadata, not invent replacement dates or approvals.

## Publication and repository policy

The inspected `Main rules` ruleset requires PRs and permits no bypass. Accordingly,
publication uses one rolling PR from `automation/decision-log`; **the table on main
updates only when that PR is merged**. The workflow never writes directly to main,
merges a PR, enables auto-merge, changes protection or provisions credentials.

A default-branch push adding a record triggers `decision-log.yml`. The trusted
workflow checks out the latest default branch, reconciles **all** merged source
records, updates only `index.json` and `docs/DECISIONS.md` on its bot branch, and
opens or updates the rolling PR. Unmerged PRs and PRs targeting other branches do
not publish. No record means no write. Generated-only commits have no record
changes, so they cannot trigger a publication loop.

Runs are serialized without canceling running jobs. Every run rereads the default
branch and reconciles all records, so delayed/retried jobs preserve decisions from
other merges. Updates retain the prior bot branch as a merge parent and use normal
fast-forward pushes, without force-pushing. A publication failure can be retried or
recovered with manual dispatch; no event-local cache or artifact is authoritative.

The workflow needs `contents: write` and `pull-requests: write` on its built-in
`GITHUB_TOKEN`. The maintainer confirmed **Allow GitHub Actions to create and
approve pull requests** is enabled, so no additional credential is required.
No repository setting was changed. If policy later disables it, keep generation
manual until the owner approves a suitable GitHub App/token or workflow policy.
Never add a token or bypass protections silently.

PRs created by `GITHUB_TOKEN` may not trigger other workflows automatically. If
required checks are introduced for the rolling PR, use an owner-approved way to
trigger them or an approved App credential; never mark them passed or bypass them.

## Local commands and recovery

Use the repository's Node 22 runtime. No new dependencies are introduced.

```bash
npm run decisions:validate
npm run decisions:test
npm run decisions:preview
npm run check:all
```

`preview` prints the table from the durable index without publishing or assigning
new decisions. Unmerged records never appear in it. For PR validation including
immutability and the one-record limit, pass the full base commit SHA:

```bash
npm run decisions:validate -- --base <full-base-commit-sha>
```

For recovery, use a clean, up-to-date default-branch checkout with full Git history
and a working `origin`. Authenticate `gh` with repository contents and pull-request
read access, then run:

```bash
git fetch origin
npm run decisions:reconcile
npm run decisions:reconcile:check
```

Reconciliation discovers the original addition commit for each tracked record,
queries that commit's associated PRs, verifies the PR merged into the default
branch and originally added that record, and checks the reviewed content at its
merge commit. It rebuilds the index and table from scratch, including entries
missing after a failed publication. Ambiguous origin or altered source is an error,
not permission to guess. Pagination handles large PRs. No historical PRs without
tracked decision records are imported, and no examples are inserted as history.

`GITHUB_REPOSITORY=owner/repo` selects the repository (otherwise origin is used).
`DECISIONS_DEFAULT_BRANCH` selects its default branch (defaults to `main` locally;
the workflow supplies the actual GitHub default branch and verifies it).
Recovery uses the repository, commit-associated-PR, PR details and PR files REST
endpoints. It requires network access; read credentials suffice to reconcile locally.
Open a repair PR for generated changes rather than pushing them directly to main.

To retry publication after approval, an owner can manually run the **Publish
decision log** workflow on the default branch. Existing mappings and merge dates
are reconstructed; the retry does not create additional rows or duplicate commits.
