# Contributing to Lease Loop

Use this workflow for team changes. [RULES.md](RULES.md) defines the judged
engineering requirements; [AGENTS.md](AGENTS.md) also applies to coding agents.
The final hackathon submission has its own format, described below.

## Make focused, conventional commits

Work on a feature branch and review `git status`, `git diff` and the staged diff
before committing. Stage only the files intended for the change. Keep each commit
focused on one understandable change.

Use `type(scope): subject` for every new commit, for example:

```text
feat(pricing): explain monthly rent and VAT
fix(invoices): clamp February due dates
docs(contributing): explain the PR summary
```

Allowed types are `feat`, `fix`, `test`, `refactor`, `docs`, `style`, `chore`, `ci`
and `perf`. Use a short scope that names the affected area and a subject that says
what changed. Add a body when a decision or trade-off needs explanation. Reference
real issues or tickets when relevant; never invent an identifier.

Keep Git hooks enabled. Fix hook failures before retrying; never use `--no-verify`
or otherwise disable the hooks. Before pushing, run `npm run check:all` (or
`make check`) and record its actual outcome. CI also checks commit messages.

## Open or update a team PR

Target the team fork's `main` branch. Use a short conventional title such as
`docs(contributing): explain the PR summary`. Add the related issue/ticket ID when
one exists. The final title must describe the final diff.

Read [.github/pull_request_template.md](.github/pull_request_template.md) before
creating or updating the PR. Keep all its sections in this order:

1. **Summary:** 1–2 short sentences, at most 50 words. Say what changed and why it
   matters to the person using or maintaining it. Use plain language; put file
   lists, implementation details and test results in the later sections.
2. **Context:** Explain the need or bug and link the related issue/ticket. Write
   `No linked issue` when there is none.
3. **Description:** Explain the resulting behavior, important implementation
   details, trade-offs and any migrations or configuration changes.
4. **Testing Instructions:** Give reproducible setup, actions, expected outcomes
   and relevant edge cases. List the commands actually run and their results.
5. **Screenshots / Recordings:** Attach available visual evidence for UI changes,
   labelled with viewport and state. Report visual review gaps. For other changes,
   write `N/A — no UI changes`.
6. **Checklist:** Check only completed items. Explain each applicable N/A and leave
   failed or unfinished checks unchecked.

For example, a summary for setup improvements could read:

> Teammates can now set up and run Lease Loop with short Make commands. The README
> explains configuration and everyday workflows.

Replace the template's prompts with concrete information. Retain headings and use
`N/A — <reason>` for an inapplicable section. Report failures and checks not run,
including environmental limitations; an alternative build does not make a failed
`npm run check:all` pass. Never invent test results, screenshots or issue links.

For UI changes, review desktop and mobile layouts and keep translation keys aligned
in en/fi/sv/et. For meaningful project choices, include one new reviewed decision
record following [the decision guide](docs/decisions/README.md). Routine changes do
not need a record. Never edit the generated decision log or merged records.

## Keep the PR accurate through review

Review the final diff yourself before requesting review. As scope changes, update
the title, summary, description and validation results together. Explain the final
behavior; omit abandoned approaches unless they explain a relevant trade-off.

When merging has been authorized, check the resulting commit message as well. For
a squash merge, use `type(scope): subject` for the squash title; GitHub uses it as
the commit subject. A descriptive but nonconventional title can make later CI fail
even when the feature branch's commits passed.

## Final judging PR

Use [.github/hackathon_submission.md](.github/hackathon_submission.md), the title
`Team <name>: <your product name>` and the upstream destination/deadline in
[README.md](README.md#submitting). Keep the submission template's sections and
report only completed Spine steps, Smart Problems, scenario cards and checks.
The team PR title and section order above do not replace this judging format.
