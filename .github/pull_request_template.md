## Summary

<!-- In 1–2 short sentences (at most 50 words), explain what changed and why it
matters to the person using or maintaining it. Use plain language. Keep file lists,
implementation details and test results in the sections below. Update this summary
when the scope changes so it describes the final diff.
Example: Teammates can now set up and run Lease Loop with short Make commands.
The README explains configuration and everyday workflows. -->

<!--
PR title: type(scope): short summary [optional ticket/issue ID]
Example: fix(auth): prevent registration crash [T1038]
Keep the title specific to the final change. Do not invent an issue ID.
Follow CONTRIBUTING.md for the commit and PR workflow.

Complete every section below. Replace prompts with concrete information.
Use "N/A — <reason>" where a section does not apply. Do not delete the headings.
For the final judging PR, use .github/hackathon_submission.md instead.
-->

## Context

<!-- Explain the customer need, business rule or bug. Why does this change matter?
Include the relevant issue/ticket link, or say "No linked issue". -->

**Problem:**

**Related issue:**

## Description

<!-- Describe the final behavior and the implementation that enables it.
Mention important decisions, trade-offs, migrations or configuration changes.
For a bug fix, explain what happens before and after the change. -->

-

<!-- Optional: if this PR introduces a meaningful project choice, link its one
reviewed JSON decision record here. Otherwise omit this note; no record is required.
See docs/decisions/README.md. Do not duplicate the record or invent a decision. -->

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

- [ ] Summary explains the final change and its benefit in 1–2 plain-language sentences (at most 50 words)
- [ ] PR title follows `type(scope): summary` and references a real issue/ticket when one exists
- [ ] Unit tests added or updated for changed logic, or N/A explained
- [ ] Documentation updated, or N/A explained
- [ ] Code self-reviewed, including the final diff
- [ ] `npm run check:all` passes; actual results recorded above
- [ ] UI changes reviewed on desktop and mobile, or N/A explained
- [ ] UI translation keys match in en, fi, sv and et, or N/A explained
- [ ] No secrets committed, no Git hooks bypassed, and no AI/ML features added to the app
