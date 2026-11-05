<!--
PR title: type(scope): short summary [optional ticket/issue ID]
Example: fix(auth): prevent registration crash [T1038]
Keep the title specific to the final change. Do not invent an issue ID.

Complete every section below. Replace prompts with concrete information.
Use "N/A — <reason>" where a section does not apply. Do not delete the headings.
For the final judging PR, use .github/hackathon_submission.md instead.
-->

## Summary

<!-- In 1–3 sentences, say what this PR delivers and the resulting behavior.
Keep this short; put the motivation and implementation in the sections below. -->

## Issues addressed

<!-- Link the primary issue and each relevant sub-issue, using #number within this
repo or a full URL for another repo/tracker. Briefly say what this PR implements
for each one. Write "None" if there are no linked issues or sub-issues.
Use "Closes #<number>" only for issues fully resolved by this PR; use "Refs #<number>"
for partial work or related context. Do not assume closing a parent closes its sub-issues. -->

**Primary issue:**

**Sub-issues addressed:**

-

**Related issues / partial work:**

## Context / Why

<!-- Explain the customer need, business rule or bug. Why does this change matter?
Describe the problem and its impact; avoid repeating the summary. -->

**Problem:**

## Description / What

<!-- Describe the final behavior and the implementation that enables it.
Mention important decisions, trade-offs, migrations or configuration changes.
For a bug fix, explain what happens before and after the change. -->

-

## Testing Instructions

<!-- Give steps a reviewer can reproduce, including setup, inputs and expected results.
List commands actually run and their outcomes. Include failures and checks not run;
never claim checks passed without evidence. Do not include secrets or real credentials. -->

1. **Setup:**
2. **Action:**
3. **Expected result:**
4. **Relevant edge cases:**

| Check / command                             | Result                                                   |
| ------------------------------------------- | -------------------------------------------------------- |
| `npm run check:all`                         | <!-- Passed, failed (explain), or not run (explain). --> |
| <!-- Additional relevant check, or N/A. --> | <!-- Actual outcome. -->                                 |

## Screenshots / Recordings

<!-- For UI changes, attach before/after screenshots or a recording, labelled by
viewport and state where useful. If unavailable, say so; never fabricate evidence.
For changes without a UI, write "N/A — no UI changes". -->

## Checklist

<!-- Check only items actually completed. Explain any N/A items underneath. -->

- [ ] Unit tests added or updated for changed logic, or N/A explained
- [ ] Documentation updated, or N/A explained
- [ ] Code self-reviewed, including the final diff
- [ ] `npm run check:all` passes; actual results recorded above
- [ ] UI changes reviewed on desktop and mobile, or N/A explained
- [ ] UI translation keys match in en, fi, sv and et, or N/A explained
- [ ] No secrets committed, no Git hooks bypassed, and no AI/ML features added to the app
