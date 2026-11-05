<!--
Title: Short, descriptive summary; include a ticket/issue number when applicable.
Example: [T1038] Fix user login crash
For the final hackathon submission, use: Team <name>: <your product name>
Remove instructions and sections that do not apply before submitting.
-->

## Context / Why

<!-- Explain the customer need, business rule, or bug and why it matters.
Link the relevant ticket/issue. Describe the previous behavior when useful. -->

Related issue:

## Description / What

<!-- Summarize the resulting behavior and implementation.
Include key decisions, trade-offs, migrations, or configuration changes reviewers need to know. -->

## Testing Instructions

<!-- Give reproducible steps, including setup, route, inputs and expected results.
Report checks actually run and any failures or checks that could not run.
Do not include real secrets or credentials. -->

1. Set up the application:
2. Open the relevant page or run the relevant command:
3. Perform the change's main interaction and verify the expected result:
4. Verify relevant edge cases:

**Automated checks and results:**

<!-- Run npm run check:all. Record its result and any blockers here. -->

## Screenshots / Recordings

<!-- For UI changes, attach before/after screenshots or a recording.
Include mobile views when relevant. For changes without a UI, write N/A. -->

## Checklist

<!-- Check only completed items. Explain any items that do not apply. -->

- [ ] Unit tests added or updated where applicable
- [ ] Documentation updated where applicable
- [ ] Code self-reviewed
- [ ] `npm run check:all` passes locally
- [ ] CI is green
- [ ] UI changes checked on desktop and mobile, where applicable
- [ ] UI translations updated in English, Finnish, Swedish and Estonian, where applicable
- [ ] No secrets committed and no Git hooks bypassed
- [ ] No AI, ML or LLM features added inside the app

<details>
<summary>Final hackathon submission — complete this section for the judging PR</summary>

## Team

| Name | GitHub | Main focus |
| ---- | ------ | ---------- |
|      |        |            |
|      |        |            |
|      |        |            |

## What we built

<!-- Two or three sentences: what it is and who it's for. -->

## The Spine

- [ ] Catalogue with today's price
- [ ] Price with sliders (term, down payment)
- [ ] Application with the question flow
- [ ] Contract that locks the price
- [ ] Monthly invoices from the contract
- [ ] End of term: buy, return or pass on
- [ ] Second life: re-price and re-lease

## Smart Problems we picked (at least 2)

- [ ] 1. Lock the price, not the tax
- [ ] 2. Fair early exit
- [ ] 3. Second-life matchmaking
- [ ] 4. The smart question flow
- [ ] 5. Money that adds up
- [ ] 6. Explain my price
- [ ] 7. Circular impact
- [ ] Wildcard:

**What's smart about our solution?** <!-- The decisions you're proud of, and the trade-offs you made. -->

## Scenario cards that work

<!-- List the numbers from CHALLENGE.md §4, for example: 1, 2, 3, 5, 9 -->

## How to run the demo

```bash
npm ci
npm run db:setup
npm run dev
```

<!-- Anything extra: seed data, a user to log in as, the page to open first. -->

## Engineering

- [ ] `npm run check:all` passes locally
- [ ] CI is green on our last commit (Actions enabled in our fork)
- [ ] No `--no-verify` was used
- [ ] No AI, ML or LLM features inside the app

## Anything else the judges should know?

</details>
