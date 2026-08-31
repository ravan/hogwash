---
name: hogwash
description: Use when the user wants to scan prose for machine-writing artifacts, rewrite a document in a sibling file, re-voice a document written by someone else into the profile owner's voice, review a Hogwash candidate, accept an approved rewrite, configure Hogwash, build the required voice, quality, and ban-list profiles, sync the scanner rule packs from their upstream sources, or when another skill needs a short message (email, chat reply, PR or commit comment) cleaned in one pass via short mode.
---

# Hogwash

Own the rewrite loop. Hogwash scans and reports. You create the candidate, rewrite it, rescan it, and ask the user to approve it.

## Run the scripts

This skill carries its own scripts. Let `$SKILL` be the directory that holds this `SKILL.md`. If `node_modules` is missing there, install the dependencies once:

```sh
cd "$SKILL" && bun install --frozen-lockfile
```

Every other command runs from the project directory, passing paths that are relative to the project:

```sh
bun "$SKILL/scripts/hogwash.ts" scan --output json docs/post.md
```

A scan exits nonzero when the scanned file has findings. That is the report, not a failure; the JSON on stdout is still valid. Redirect `--output json` scans to a scratch file and read the file, because a full report often overflows a terminal capture.

The scripts read `hogwash.json` and the profile files from the current working directory, so keep the project directory as the working directory. `hogwash.json` is optional: when it is absent, the built-in defaults apply and the scripts say so on stderr. The defaults keep `workflow.advanced` off — no consultant, no subagent; when a project turns it on, both advisers default to Claude. A relative profile path that does not exist in the project resolves against `~/.idiolect/` instead, so several projects can share one voice through `~/.idiolect/profiles/<name>/`. The project copy always wins when both exist. Bun 1.4 or later is required. If `bun` is missing, report that and stop.

## Set the project up

No setup is required to scan: without `hogwash.json` the defaults apply, and profiles are found in the project or under `~/.idiolect/`. Run init only when the project needs its own fine-tuning (packs, threshold, register, models, diff viewer) or its own local profile seeds:

```sh
bun "$SKILL/scripts/hogwash.ts" init
```

This writes `hogwash.json` and copies `profile/voice.md`, `profile/quality.md`, and `profile/ban-list.md` from the bundled templates. It never overwrites a profile that already exists. It installs nothing else, because this skill is already installed.

The copied profiles are seeds. The `/idiolect` skill builds the real ones: it captures the voice as evidence-backed mechanics and may add per-format overlays in a `registers/` directory beside the voice profile. Only the user runs `/idiolect`. Suggest it when the profiles need work; never invoke it yourself.

## Short mode: one pass for short messages

Short mode cleans one short message — an email, a chat reply, a PR or commit comment. It is the entry point other skills call. Callers stay on this surface: they never pick packs, read rule internals, or touch the document workflow. None of the document machinery applies in short mode: no candidate file, no baseline ledger, no pass counter, no advisers, no review gate, no plan surface, no score block. The caller owns the draft and the send decision.

The contract:

1. Write the draft to a scratch file.
2. Scan it: `bun "$SKILL/scripts/hogwash.ts" scan --short --output json <file>`. Add `--register prose` for email and chat; the default `technical` register fits code-adjacent comments. `--short` turns off the rules whose statistics need a long document.
3. Rewrite the draft once. Fix every actionable finding and apply the voice profile, the register overlay matching the format when one exists, and the ban list — all inside the source-fidelity boundary below.
4. Rescan once. Return the rewritten text with a one-line status: clean, or each remaining finding and why it stands.

Like every hogwash command, short mode works without a project `hogwash.json`: defaults apply, and profile paths resolve through `~/.idiolect/` as described above. A finding that would need the author's call (a flagged claim, a meaning change) is never resolved silently: leave the text as written and name it in the status line.

## Keep these boundaries

- Run `bun "$SKILL/scripts/hogwash.ts" scan` explicitly whenever you need scanner results. No other command scans.
- Never modify the original during a rewrite cycle.
- Use `<stem>-hogwash<ext>` as the candidate. For `docs/post.md`, use `docs/post-hogwash.md`. For `README`, use `README-hogwash`.
- Treat the configured consultant and native subagent as read-only advisers. They never edit shared files, run scans, or own the loop.
- Run `bun "$SKILL/scripts/hogwash.ts" accept --approved <original>` only after the user explicitly asks to accept the candidate.

## Show the workflow as a live plan

When the harness offers a plan or todo surface (the plan tool in Codex, the task list in Claude Code), keep the Hogwash workflow on it for the whole session, updating a step's status the moment it changes. Use these canonical steps so every harness shows the same plan:

1. Validate the configuration and profiles
2. Scan the original and freeze the baseline
3. Create or resume the candidate
4. Rewrite the candidate (one entry per pass: "Rewrite pass N")
5. Judge the textual diff and rescan
6. Present decisions and the review gate
7. Accept the candidate (only after an explicit request)

Keep exactly one step in progress at a time. When the loop pauses on a user decision, the pending step stays open and its one-line note names what the user must decide. Add a step only for real extra work (for example a consultation); never pad the plan. If the harness has no plan surface, open each handoff with a single status line instead: step just finished, step now pending.

## Preserve the author's information

Hogwash is an editing workflow, not a research or authorship workflow. The original document is the sole source of factual and argumentative content.

- You may rephrase, reorder, split, combine, or remove empty filler while fixing findings and applying the profiles. Preserve every substantive fact, claim, example, number, name, citation, position, relationship, and degree of certainty.
- Never add a fact, claim, example, number, name, source, citation, link, argument, counterargument, recommendation, conclusion, implication, or other information that is absent from the original. Do not browse or research to enrich, verify, source, or fill gaps in a rewrite.
- A profile never overrides source fidelity. If a scanner finding or profile requirement needs information the original does not contain, leave that requirement unmet and report the conflict as a non-blocking review question. Do not invent a compliant passage. The same applies when the only way to resolve a finding is to weaken, strengthen, or drop an author's claim (for example a singularity or totalising claim the scanner flags): leave the row unresolved and raise it as a choice question (keep the claim and waive the finding, apply a quoted rewording, or drop the claim) instead of silently changing the claim. If the user then explicitly confirms the flagged claim is intended, mark that row `Waived (owner)`. A waived row counts as settled at every gate that requires an actionable-clean scan, but it stays in the report so the decision is visible. A waiver covers only that occurrence, comes only from an explicit user statement in this conversation, and is never inferred from silence, from advice, or from a request to continue. This conflict exception covers factual claims only: a finding changes a claim only when the sentence's truth conditions change. Rhetorical emphasis, evaluative adjectives, and announcement crutches (perfect, genuinely, exactly, cutting-edge) are style, not claims; fix them by naming the concrete thing, even though the sentence reads weaker afterwards. "Removing this word weakens the sentence" is never by itself a reason to escalate. When the user directs a rewording that keeps the flagged claim, record the row as `Waived (owner)` with that instruction as the waiver, never as `Resolved`: the scanner merely stopped matching, and the ledger must say the owner kept the claim.
- If the user wants new substance, keep it outside the Hogwash rewrite cycle. Ask them to update the original or start a separate content-editing task.

### Preserve proposition boundaries

- Preserve more than the general meaning. For every proposition, keep the same actor, action, object, referent, technical artefact, scope, modality, polarity, quantifier, time, sequence, condition, exception, cause, relationship, comparison, emphasis, and degree of certainty.
- Treat semantic qualifiers as substantive content. Words and phrases such as `may`, `might`, `can`, `would`, `must`, `only`, `always`, `never`, `under`, `when`, `taken literally`, and `depending on` cannot be added, removed, or substituted unless the resulting proposition is identical.
- Never broaden a claim from one question, component, example, or circumstance to a framework, system, category, or general rule. Never narrow one in the opposite direction. Preserve the original technical noun instead of replacing it with a broader near-synonym.
- Treat every new sentence, heading, callback, transition, synthesis, and summary as a claim that needs direct support in the original. Combining two source passages must not create a new conclusion, implication, causal link, comparison, or degree of emphasis.
- Prefer the smallest local edit that resolves a finding. Rewrite a whole paragraph or document only when necessary, because larger rewrites increase the chance of semantic drift.

### Judge a textual diff

- After every autonomous or user-directed edit pass, run a textual diff tool against the original and read the diff itself. Opening a graphical diff without judging it, comparing from memory, preserving the gist, or relying on a scanner is not verification.
- Judge fluency as well as fidelity. Read every changed sentence on its own. If the smallest local edit left a strained clause or a circular statement, rewrite that whole sentence instead of shipping the patch.
- Judge structure as well as propositions. Keep the original's paragraph boundaries and sentence-length spread unless a specific finding or profile rule forces the change. Splitting paragraphs or evening sentences out across the document is a rewrite defect, not a fix.
- Audit every changed or added sentence and heading against the original passage that supports it. Check every proposition boundary above. Remove or correct anything that cannot be traced directly to the original.
- Run and judge the textual diff again immediately before the review gate and immediately before acceptance. A clean scan proves only that the scanner found no actionable patterns. It never proves source fidelity.
- Do not report source-fidelity compliance while any scope, modality, qualifier, technical referent, relationship, emphasis, or degree of certainty has changed. Report the exact mismatch instead.

## Validate the project

Before any workflow action, read `hogwash.json` when it exists and confirm that all three `profile` paths exist and contain text. Resolve each relative path in the project first; when the file is not there, resolve the same path under `~/.idiolect/` (for example `profiles/rav/voice.md` → `~/.idiolect/profiles/rav/voice.md`). A profile counts as present when either copy exists; the project copy wins when both do. Confirm that `workflow.maxPasses` is a positive integer.

A missing `hogwash.json` is not an error: the defaults apply, and this validation continues against the default profile paths. Only in this no-config default mode does a scan-only run tolerate a missing ban list. When `hogwash.json` exists, the configured ban list must resolve for every scan: an explicit config is validated strictly. The document rewrite workflow requires all three profiles to resolve in both modes. When a profile is missing everywhere, run `bun "$SKILL/scripts/hogwash.ts" init` to create the scaffold files (it preserves every profile that already exists), and suggest `/idiolect` for the real voice.

A malformed or schema-invalid `hogwash.json` stops the workflow. If reading the file fails or any Hogwash command reports a configuration error, report the exact error and ask the user to fix the configuration. Do not edit or bypass the configuration, create or resume a candidate, or continue with another workflow action.

Use [the profile interview](references/profile-interview.md) when the profile needs work.

## Pick the scanner register

The scanner knows exactly three registers — `technical`, `prose`, and `marketing` — and calibrates every stylometric baseline and rule weight per register. `hogwash.json` sets the project default. A document scanned under the wrong register gets skewed findings.

Before the first scan of a document, map its format to a scanner register:

- `technical` — architecture documents, ADRs, READMEs, API references, runbooks, specifications.
- `prose` — blog posts, essays, articles, emails, and other narrative or personal writing.
- `marketing` — landing pages, product copy, press releases, announcements.

When the mapped register differs from the project default, pass `--register <name>` on every scan of that document. Use the same register for the baseline scan and every candidate rescan; changing it mid-loop makes the scans incomparable. When the format is unclear, use the project default and say so.

This choice calibrates the scanner only. The idiolect `registers/` overlays are a separate mechanism: they shape the rewrite voice per format, and their names are open-ended. The two line up by format, not by name — a `blog` overlay pairs with the `prose` scanner register.

## Rewrite one document

This is scrub mode, the default: remove machine artifacts and profile violations with the smallest faithful edits. When the user directs a voice transfer into the owner's voice, the rules below still govern, but "Re-voice a document" overrides the minimal-edit rules; read both before the first pass.

1. Run `bun "$SKILL/scripts/hogwash.ts" scan --output json --register <register> <original>`, using the register picked above.
2. Freeze a baseline checklist from that report. Never replace its rows or evidence with a later scan. Completion status is the only mutable column.
3. Record each baseline row with these fields: ID, rule, line and column, match, message, suggestion, actionable or advisory state, and completion status.
4. Create the candidate by copying the original, unless the candidate already exists. If it exists, resume it without copying over it. Reconstruct completion status against the resumed candidate and start a new autonomous pass budget. Always produce the candidate, even when the baseline has no actionable findings.
5. Rewrite only the candidate. Apply the baseline checklist, the voice profile, the combined quality and style rules, and the ban list within the source-fidelity boundary. If a `registers/` directory exists beside the voice profile, also read the overlay whose name matches the document's format (blog, email, tech-doc, ...); the overlay overrides the core voice where they differ. Match the profile's mechanics, not just its word choices: keep the writer's sentence-length spread instead of evening sentences out, and keep their punctuation, contraction, and pronoun habits. When the `idiolect` skill is installed, its `references/apply.md` self-check order governs the rewrite. Four rules keep machine signals out of the rewrite: never replace an unusual but correct word with a more common synonym; leave a sentence with no baseline finding and no profile violation exactly as it is, because uniform polish is itself a machine signal; vary how paragraphs move, because a claim-support-wrap shape repeated across paragraphs reads as machine even when sentence lengths vary; and delete an empty scaffold sentence outright instead of rewording it.
6. Verify every original actionable baseline row against the candidate. Run and judge a textual diff against the original under the proposition-boundary rules after every pass. Remove any introduced proposition and restore any removed, broadened, narrowed, strengthened, weakened, or imprecisely renamed proposition. Mark a row complete only when the candidate resolves that occurrence without breaking the profiles or source fidelity. A row is resolved only when the problem the message describes is gone from the passage. Applying a ban means rewriting the construction, never substituting the nearest look-alike token (a colon or spaced hyphen standing in for a banned em-dash, italics standing in for a deleted emphasis phrase). A punctuation, synonym, or word-order swap that stops the pattern from matching while the flagged claim or construction survives does not resolve the row.
7. Run `bun "$SKILL/scripts/hogwash.ts" scan --output json --register <register> <candidate>` explicitly, with the same register as the baseline scan.
8. If the current scan contains actionable findings other than owner-waived rows, rewrite the candidate and repeat from step 6.

Advisory findings do not block completion. Handle each one inside the rewrite: fix it or leave it, and report the action in one line. Raise a review question only when the choice changes meaning, scope, or an author's claim, or when a profile and the source conflict. Never ask approval for an edit a hard ban already requires, and never ask approval for a routine style edit the profiles already mandate.

## Re-voice a document

Re-voice mode is a voice transfer: the document was written by someone else, and the user directs you to rewrite it in the profile owner's voice. It runs only on that explicit direction ("re-voice this", "rewrite it in my voice"). Never enter it on your own judgment, and never treat a scrub request as a re-voice request. Everything in "Rewrite one document" applies except where this section overrides it.

The failure mode this section exists to prevent: treating a re-voice as a scrub, trimming commas and lone words, and shipping the other author's voice under the owner's name. If your diff is mostly single-word swaps and punctuation, you are in that failure mode.

**What changes in re-voice mode.** These scrub rules are suspended:

- "Leave a sentence with no finding and no violation exactly as it is." In re-voice, every sentence is either rebuilt in the owner's voice or kept deliberately because it already reads as the owner. Keeping is a per-sentence decision, never a default.
- "Prefer the smallest local edit." The unit of work is the paragraph, rewritten fresh from its propositions.
- "Keep the original's paragraph boundaries and sentence-length spread." The target rhythm, paragraph shape and emphasis habits are the owner's (voice.md and the register overlay), not the source author's. One-sentence drum-roll paragraphs, staccato fragment chains and typographic emphasis (bold, italics) are delivery devices; rebuild them to the owner's habits. The claim keeps its full strength; it loses the other author's delivery.
- "Keep the colons the author wrote." In re-voice, "the author" means the profile owner. A source-author colon that pauses mid-sentence for elaboration is an em-dash substitute: rewrite it as the ban list directs. Keep only colons the owner's mechanics allow (a true list, a setup the owner would write).

**What never changes, in any mode:** every proposition boundary (fact, claim, number, name, actor, scope, modality, polarity, quantifier, certainty), direct quotations, citations, code, table data, headings and section order. Add nothing, drop nothing. When a voice rule needs information the source does not contain, leave it unmet and raise it at the review gate.

**The layered loop.** Alternate machine-smell passes and voice passes until both come back empty:

1. Scan the original, freeze the baseline, create the candidate (as in the document workflow).
2. Smell pass: resolve every actionable finding in the candidate.
3. Voice pass: rewrite the candidate paragraph by paragraph. For each paragraph: list its propositions from the source; write the paragraph fresh in the owner's voice (dimensions, mechanics, function words, signature moves, register overlay); check every ban; verify each proposition survived with identical boundaries.
4. Rescan with the same register. A voice pass can introduce machine smells, and a smell fix can flatten the voice, so the layers repeat.
5. Repeat from step 2 until one full cycle produces zero actionable findings beyond owner-waived rows AND a voice pass with zero edits. A cycle that changed anything does not count as converged; run another.
6. Judge the textual diff against the original under the proposition-boundary rules, then hand off at the review gate as usual.

Each cycle (steps 2-4) consumes one autonomous pass from `workflow.maxPasses`. On the plan surface, name the entries "Cycle N: smells" and "Cycle N: voice".

**Rationalizations, all observed in a real failed session:**

| Excuse | Reality |
| --- | --- |
| "This sentence has no finding, so it stays" | That is scrub mode. In re-voice, an untouched sentence is a decision to keep the other author's sentence. Make it deliberately, sentence by sentence. |
| "Bold is emphasis and emphasis is content" | The claim's strength is content. The delivery device is voice. Restate the claim at full strength in the owner's idiom. |
| "The author wrote that colon, so it stays" | The source author is not the owner. The owner's mechanics decide every construction. |
| "A full rewrite risks semantic drift, so I trim words" | Word-trimming is the failure mode: it ships the other author's voice under the owner's name. Drift is controlled by the per-paragraph proposition check, not by refusing to rewrite. |

**Red flags. Stop and restart the voice pass when:** the diff is mostly commas and single words; no paragraph was rebuilt; the other author's one-liner beats, bold pattern or counting openers survive; you just quoted a scrub rule to justify keeping a sentence.

## Show what static scanning found

At every review-gate or stopped-loop handoff, report the frozen initial scan in summary form before asking the user what to do next: the total number of baseline findings, split into actionable and advisory counts, and how many actionable rows are resolved versus unresolved. Do not render the per-finding table unless the user asks for details.

Two kinds of rows still get individual reporting even in summary mode, because the user must decide them: unresolved actionable rows (one line each: rule, match, why it is unresolved) and review questions raised by advisory findings or source-versus-profile conflicts.

When the user asks for details, render every baseline row in source order as this Markdown table:

| ID | Rule | Location | Match | Finding | Suggestion | Kind | Status |
| ---: | --- | --- | --- | --- | --- | --- | --- |

Use the original `line:column`, match, message, and suggestion. Write `None` when the scanner supplied no suggestion. Set actionable status to `Resolved`, `Unresolved`, or `Waived (owner)`; set advisory status to `Review` and follow the table with its review question. Escape table-breaking characters without changing the evidence.

In both modes, never substitute findings from a candidate rescan, omit completed rows from a requested table, or present scanner cleanliness as proof of profile compliance. The baseline checklist stays fully recorded internally regardless of what is shown.

## Stop a stuck loop

Each autonomous feedback cycle gets `workflow.maxPasses` rewrite passes. Creating or copying a candidate does not consume a pass. Each autonomous edit does. Stop earlier when two consecutive rescans contain the same multiset of `(ruleId, normalised match)` pairs for actionable findings, excluding owner-waived rows. Normalise a match by trimming it, collapsing whitespace, and converting it to lower case.

If `workflow.advanced.enabled` is true, you may seek advice before stopping. If it is false, do not invoke a consultant or native subagent. Each mechanism also has its own flag: use the consultant only when `workflow.advanced.useConsultant` is true, and the native subagent only when `workflow.advanced.useSubagent` is true.

The user may request a consultation at any point in the loop, not only when a stopping condition threatens. Treat it as user-directed advice under the same rules. When a required flag is false, do not flip it yourself and do not bypass it: ask the user to change the configuration, or to confirm the exact change, before running the consult.

When `workflow.advanced.enabled` and `workflow.advanced.useSubagent` are both true, you may also start one proactive subagent consult per rewrite cycle on your own judgment, before the review gate, when you expect the advice to improve the candidate. It follows the same subagent rules. One is the cap: after it is spent, a further consult in the same cycle happens only when a stopping condition threatens or the user asks. A user-directed revision that resets the pass budget also restores the proactive consult.

- For `workflow.advanced.consultant`, put one non-empty question on stdin and run `bun "$SKILL/scripts/hogwash.ts" consult --family <family> <candidate>`. The command uses `models.<family>` as configured. Do not bypass it with a different model or effort. Include relevant findings in the question when you want the consultant to see them, and always include the ban list and the profile rules that govern the passages under discussion; the consultant sees nothing you do not send, so without them it will propose banned or off-voice constructions. Check every suggestion against the baseline checklist, the ban list, and the profiles before applying any part of it.
- For `workflow.advanced.subagent`, start a read-only task and provide the candidate, all three profile documents, the register overlay that matches the document's format when one exists, and the constructions the loop has already removed from the candidate, so the subagent does not propose them back. Like the consultant, the subagent sees nothing you do not send. Use the exact model and effort from `models.<family>`; never pick a different value for either setting yourself. If the harness cannot set that exact model, do not start the task: report the limit and ask the user. If it can set the model but exposes no effort control, start the task anyway and name the missing control in the consult report.

Advice is optional. Apply it yourself only when it fits the checklist and profiles. Advice does not reset either stopping condition or authorize another autonomous pass after a stopping condition fires. Never let an adviser edit the candidate, trigger a scan, or take over the loop.

When a stopping condition fires with actionable findings, keep the original and candidate unchanged. Report the residual actionable findings, the completed and incomplete baseline rows, and any advice. Ask the user how to proceed.

## Put decisions to the user as choices

Whenever the workflow needs a user decision — the next step at a review gate, a claim-strength conflict and its possible waiver, a meaning-changing advisory question, or a polish-list fix — present it as a question with exactly three concrete options. The user picks one or types their own.

- When the harness has an interactive question tool (AskUserQuestion or equivalent), use it. Put the recommended option first and end its label with "(Recommended)". The harness adds the free-text "Other" choice itself, so never add a catch-all option of your own. One call may carry up to four questions; batch related decisions into one call.
- Without such a tool, write the same structure as text: the question, three numbered options with the recommendation first, and a fourth line inviting a typed alternative.
- Make every option a concrete action whose effect on the candidate is stated in the option itself. For wording decisions, quote the exact replacement text in the option, so picking it is picking the sentence.
- Every offered option must itself satisfy the proposition-boundary rules. Never offer wording that would make a neighbouring sentence false, add a causal link the source does not state, or otherwise smuggle in a change the rules forbid you from making directly.
- Never fire more than four questions per handoff. Fold the remainder into the polish list or the report.
- A picked option is a user-directed edit under the existing rules. Picking a "waive" option is an explicit owner waiver. An "accept the candidate" option may appear only at the review gate when every acceptance condition is already met, and picking it is an explicit acceptance request.

## Ask for review

When the current scan has no actionable findings beyond owner-waived rows, the final textual diff has been judged under the proposition-boundary rules, the candidate is source-faithful, and it follows every profile rule that can be satisfied without new information, ask the user to review the candidate, and put the next step to them as a choice question (see "Put decisions to the user as choices"). If `workflow.diff` is a configured `{ command, args, wait }` object, also ask whether to run `bun "$SKILL/scripts/hogwash.ts" diff <original>`. If it is `null`, do not offer a diff. Defer an early diff request until this review gate.

The review handoff reports five results separately: actionable scanner status, source-fidelity compliance, voice-profile compliance, combined quality-and-style-profile compliance, and ban-list compliance. It ends with the score block and the human polish list (see "Score the candidate"). State whether the candidate added, removed, strengthened, or weakened any substantive information. Give concrete evidence for each profile result instead of treating a clean scan as proof that the profiles were applied. Report each advisory finding's disposition in one line (fixed, or left and why). If a consultation or subagent review happened since the last handoff, report its disposition too: which suggestions were applied, which were rejected, and why, one line each. Raise review questions only for meaning-changing choices and source-versus-profile conflicts.

If the user requests revisions, edit only the candidate. Freeze the original baseline checklist as-is. The user-directed edit does not consume an autonomous pass. Reset both the autonomous pass budget and consecutive-rescan history, then restart the explicit verification and rescan loop.

If the user asks to overwrite or accept early, explain that acceptance requires a final scan after review with no actionable findings beyond owner-waived rows. Keep the original unchanged. Do not bank that request as later approval.

## Render the diff report

The diff report is a standalone HTML redline: each changed passage as original beside revision with word-level removed/added marks, the before-and-after scanner stats, and a table of owner-waived findings. The script computes everything mechanical itself — it rescans both files, aligns the paragraphs, diffs the words, numbers the lines, names the sections, and attaches the rule chips. You supply only the judgment fields, as JSON in a scratch file, so none of it passes through the conversation.

Offer the report at the review gate, and render it whenever the user asks for a visual or shareable diff.

1. Write the judgment JSON to a scratch file, never into the project. Every field is optional; `{}` is valid:

   ```json
   {
     "title": "Post title",
     "subtitle": "One line of context under the title",
     "intro": "One sentence on how the edits were made",
     "factsAltered": 0,
     "scores": { "readsHuman": [7, 8], "contentQuality": [8, 8] },
     "waived": [
       { "line": 54, "rule": "vale.figurative-quantities.a-handful", "match": "a handful", "reason": "Verbatim ECB quotation." }
     ],
     "annotations": [{ "line": 197, "label": "voice: not-this-but-that" }],
     "footer": "Extra closing sentence."
   }
   ```

   `waived` rows fill the "findings left standing" table and restate every owner waiver; `annotations` add judgment chips (a voice edit, for example) to the passage whose original line range contains that line; `scores` and `factsAltered` restate the review-gate judgment. Take the line numbers from the baseline checklist.

2. Run it with the same register as the baseline scan:

   ```sh
   bun "$SKILL/scripts/hogwash.ts" diff-report --notes <scratch>/notes.json --register <register> <original>
   ```

The candidate is the usual sibling (`docs/post.md` → `docs/post-hogwash.md`) and must exist. The report lands in `.hogwash/<name>-diff.html` unless `--out` names another path; the command prints the path it wrote. Report that path to the user and do not paste the HTML into the conversation. Adding `--open` also launches the written report in the system's default browser: when the user has already asked to see the report, pass it on the same run; otherwise offer opening it as one of the choice options after rendering. The report is a view, not a gate: it never replaces the review-handoff summary, and rendering it approves nothing.

## Score the candidate

Close every review handoff with a score block. It has two parts.

First, two scores from 1 to 10, given for the original and for the candidate so the user sees the movement:

- **Reads human** (10 = no machine flavour). Anchor it in evidence, not vibes: a density at or above the configured threshold caps this score at 5; an actionable-clean scan is necessary for 7 but never sufficient. Scores of 8 or higher require what a scanner cannot check: varied rhythm, no patched-sounding sentences, no ghost of a removed tell surviving in new wording, no uniform polish across the whole piece, no rare word flattened into a common synonym, and no one paragraph shape repeated across the document.
- **Content quality** (argument, evidence, structure). Under source fidelity the two content scores should match; when they differ, name the exact proposition that changed (for example a waived or weakened claim) as the reason.

Give each score a one-sentence justification. Never present the scores as scanner output; they are editorial judgment built on the scan, the diff, and the profiles.

Second, the **human polish list**: the specific lines that hold the reads-human score down and need an owner's hand. For each entry give the line number, the quoted text, a few words on what is wrong, and the kind of fix that would raise the score. List only what a human must judge: roughening over-smooth prose, restoring punch, claim strength, taste calls the profiles do not settle. Anything the loop may fix autonomously belongs in the loop, never on this list. Order the list by impact and cap it at 10 entries. You may put the top entries to the user as choice questions with quoted rewrites, within the per-handoff question cap. Do not edit these lines yourself, in this pass or a later one, unless the user directs the specific edit.

## Accept the candidate

After the user reviews the current candidate and explicitly requests acceptance:

1. Run `bun "$SKILL/scripts/hogwash.ts" scan --output json --register <register> <candidate>` one final time, with the same register as the baseline scan.
2. If any actionable finding other than an owner-waived row remains, return to the rewrite loop without resetting the current pass budget. After the candidate is clean again, ask for review and obtain a new explicit acceptance request.
3. If the candidate has no actionable findings beyond owner-waived rows, the final textual diff has been judged under the proposition-boundary rules, the candidate is source-faithful, and it complies with every non-conflicting profile rule, run `bun "$SKILL/scripts/hogwash.ts" accept --approved <original>`.
4. Report that the candidate replaced the original and that the sibling no longer exists. Restate every owner-waived row and the user statement that waived it.

Do not infer approval from silence, a clean scan, or a request to show a diff.

## Sync the rule sources

Sync only when the user asks for it. Run inside the skill directory:

```sh
cd "$SKILL" && bun scripts/sync/main.ts --all              # every source
cd "$SKILL" && bun scripts/sync/main.ts --source slop-gate # one source
```

Structured sources update their packs deterministically. Prose sources draft advice through a model and write `*.proposed.json` proposals beside the packs; pass `--detect-only` to record upstream drift without drafting. The sync never commits. Report which packs changed and which proposals wait for review, and leave the git diff and every proposal decision to the user.
