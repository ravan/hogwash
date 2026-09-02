# The review gate

Read this when the loop reaches a review gate or a stopped-loop handoff.

## Show what static scanning found

At every review-gate or stopped-loop handoff, report the frozen baseline (`.hogwash/<stem>-baseline.json`) in summary form before asking the user what to do next: the total number of baseline findings, split into actionable and advisory counts, and how many actionable rows are resolved, waived, or unresolved. Do not render the per-finding table unless the user asks for details.

Two kinds of rows still get individual reporting even in summary mode, because the user must decide them: unresolved actionable rows (one line each: rule, match, why it is unresolved) and review questions raised by advisory findings or source-versus-profile conflicts.

When the user asks for details, render every baseline row in source order as this Markdown table:

| ID | Rule | Location | Match | Finding | Suggestion | Kind | Status |
| ---: | --- | --- | --- | --- | --- | --- | --- |

Use the original `line:column`, match, message, and suggestion from the baseline file. Write `None` when the scanner supplied no suggestion. Set actionable status to `Resolved`, `Unresolved`, or `Waived (owner)`; set advisory status to `Review` and follow the table with its review question. Escape table-breaking characters without changing the evidence.

In both modes, never substitute findings from a candidate rescan, omit completed rows from a requested table, or present scanner cleanliness as proof of profile compliance.

## The handoff report

The review handoff reports five results separately: actionable scanner status, source-fidelity compliance, voice-profile compliance, combined quality-and-style-profile compliance, and ban-list compliance. It ends with the score block and the human polish list below. State whether the candidate added, removed, strengthened, or weakened any substantive information. Give concrete evidence for each profile result instead of treating a clean scan as proof that the profiles were applied. Report each advisory finding's disposition in one line (fixed, or left and why). If a consultation or subagent review happened since the last handoff, report its disposition too: which suggestions were applied, which were rejected, and why, one line each. Raise review questions only for meaning-changing choices and source-versus-profile conflicts.

Offer the HTML redline (see [diff-report.md](diff-report.md)) as one of the choice options at the gate.

## Score the candidate

Close every review handoff with a score block. It has two parts.

First, two scores from 1 to 10, given for the original and for the candidate so the user sees the movement:

- **Reads human** (10 = no machine flavour). Anchor it in evidence, not vibes: a density at or above the configured threshold caps this score at 5; an actionable-clean scan is necessary for 7 but never sufficient. Scores of 8 or higher require what a scanner cannot check: varied rhythm, no patched-sounding sentences, no ghost of a removed tell surviving in new wording, no uniform polish across the whole piece, no rare word flattened into a common synonym, and no one paragraph shape repeated across the document.
- **Content quality** (argument, evidence, structure). Under source fidelity the two content scores should match; when they differ, name the exact proposition that changed (for example a waived or weakened claim) as the reason.

Give each score a one-sentence justification. Never present the scores as scanner output; they are editorial judgment built on the scan, the diff, and the profiles.

Second, the **human polish list**: the specific lines that hold the reads-human score down and need an owner's hand. For each entry give the line number, the quoted text, a few words on what is wrong, and the kind of fix that would raise the score. List only what a human must judge: roughening over-smooth prose, restoring punch, claim strength, taste calls the profiles do not settle. Anything the loop may fix autonomously belongs in the loop, never on this list. Order the list by impact and cap it at 10 entries. You may put the top entries to the user as choice questions with quoted rewrites, within the per-handoff question cap. Do not edit these lines yourself, in this pass or a later one, unless the user directs the specific edit.
