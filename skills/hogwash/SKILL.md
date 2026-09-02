---
name: hogwash
description: Use when the user wants to scan prose for machine-writing artifacts, rewrite a document in a sibling file, re-voice a document written by someone else into the profile owner's voice, review a Hogwash candidate, accept an approved rewrite, configure Hogwash, build the required voice, quality, and ban-list profiles, sync the scanner rule packs from their upstream sources, or when another skill needs a short message (email, chat reply, PR or commit comment) cleaned in one pass via short mode.
---

# Hogwash

Own the rewrite loop. Hogwash scans and reports. You create the candidate, rewrite it, rescan it, and ask the user to approve it.

This file holds the loop and its boundaries. Four references hold the rest; read each one only when its step comes up:

- [references/re-voice.md](references/re-voice.md): voice transfer of a document someone else wrote.
- [references/advisers.md](references/advisers.md): the read-only consultant and subagent, when a project turns them on.
- [references/review-gate.md](references/review-gate.md): the handoff report, the score block, the polish list, the findings table.
- [references/diff-report.md](references/diff-report.md): the standalone HTML redline.
- [references/sync.md](references/sync.md): refreshing the rule packs from upstream.

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

The scripts read `hogwash.json` and the profile files from the current working directory, so keep the project directory as the working directory. `hogwash.json` is optional: when it is absent, the built-in defaults apply and the scripts say so on stderr. The defaults keep `workflow.advanced` off (no consultant, no subagent); when a project turns it on, both advisers default to Claude.

A relative profile path that does not exist in the project resolves against the shared profile root instead, so several projects can share one voice through `<root>/profiles/<name>/`. The root is `$IDIOLECT_HOME` when that variable is set, otherwise `~/.idiolect`. The project copy always wins when both exist. When a profile is missing everywhere and you suspect a redirected home directory, say so and suggest setting `IDIOLECT_HOME`.

Bun 1.4 or later is required. If `bun` is missing, report that and stop.

## Set the project up

No setup is required to scan: without `hogwash.json` the defaults apply, and profiles are found in the project or under the shared root. Run init only when the project needs its own fine-tuning (packs, threshold, register, models, diff viewer) or its own local profile seeds:

```sh
bun "$SKILL/scripts/hogwash.ts" init
```

This writes `hogwash.json` and copies `profiles/default/voice.md`, `profiles/default/quality.md`, and `profiles/default/ban-list.md` from the bundled templates. It never overwrites a profile that already exists. It installs nothing else, because this skill is already installed. The seed ban list has no bullets, so a scan runs with a stderr note that no bans are active until the user approves entries.

The name `default` is reserved for a neutral profile: the seeds, or a house voice a team shares. A person's voice lives under its own name (`profiles/<name>/`), and `hogwash.json` selects it through the three `profile` paths. Never write personal bans or habits into `default`, and never suggest `default` as the name for someone's own voice.

The copied profiles are seeds. The `/idiolect` skill builds the real ones: it captures the voice as evidence-backed mechanics in the same `profiles/<name>/` layout and may add per-format overlays in a `registers/` directory beside the voice profile. Only the user runs `/idiolect`. Suggest it when the profiles need work; never invoke it yourself. Use [the profile note](references/profile-interview.md) for the fallback when `/idiolect` is not installed.

**House mechanics.** One pack ships off by default. `mechanics` holds punctuation and length rules (connector dashes, more than one comma in a sentence, paragraphs past three sentences). These are a writer's house preference rather than a machine-writing tell, so a project turns the pack on by naming `"mechanics"` in the `packs` array of `hogwash.json`. The two counting rules read their ceiling from a `limit` field in the pack. A house rule has to hold every time, and density alone will not enforce that, so add `--fail-on error` to the scan when a single breach should fail the run; every mechanics rule is an `error`.

## Short mode: one pass for short messages

Short mode cleans one short message: an email, a chat reply, a PR or commit comment. It is the entry point other skills call. Callers stay on this surface: they never pick packs, read rule internals, or touch the document workflow. None of the document machinery applies in short mode: no candidate file, no baseline, no pass counter, no advisers, no review gate, no plan surface, no score block. The caller owns the draft and the send decision.

The contract:

1. Write the draft to a scratch file.
2. Find the profiles: read the three `profile` paths from `hogwash.json` (or the defaults under `profiles/default/`), resolve each in the project first and then under the shared root, and look for a `registers/<format>.md` overlay beside the voice profile.
3. Scan it: `bun "$SKILL/scripts/hogwash.ts" scan --short --output json <file>`. Add `--register prose` for email and chat; the default `technical` register fits code-adjacent comments. `--short` turns off the rules whose statistics need a long document.
4. Rewrite the draft once. Fix every actionable finding and apply the voice profile, the register overlay matching the format when one exists, and the ban list, all inside the source-fidelity boundary below.
5. Rescan once. Return the rewritten text with a one-line status: clean, or each remaining finding and why it stands.

A finding that would need the author's call (a flagged claim, a meaning change) is never resolved silently: leave the text as written and name it in the status line.

## Keep these boundaries

- Run `bun "$SKILL/scripts/hogwash.ts" scan` explicitly whenever you need scanner results. No other command scans.
- Never modify the original during a rewrite cycle.
- Use `<stem>-hogwash<ext>` as the candidate. For `docs/post.md`, use `docs/post-hogwash.md`. For `README`, use `README-hogwash`.
- Treat the configured consultant and native subagent as read-only advisers. They never edit shared files, run scans, or own the loop.
- Run `bun "$SKILL/scripts/hogwash.ts" accept --approved <original>` only after the user explicitly asks to accept the candidate.
- Record a waiver with `bun "$SKILL/scripts/hogwash.ts" waive` only when the user has explicitly waived that occurrence in this conversation.

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
- A profile never overrides source fidelity. If a scanner finding or profile requirement needs information the original does not contain, leave that requirement unmet and report the conflict as a non-blocking review question. Do not invent a compliant passage.
- The same applies when the only way to resolve a finding is to weaken, strengthen, or drop an author's claim (for example a singularity or totalising claim the scanner flags): leave the row unresolved and raise it as a choice question (keep the claim and waive the finding, apply a quoted rewording, or drop the claim) instead of silently changing the claim. If the user explicitly confirms the flagged claim is intended, record the waiver (see "Waive a finding"). A waiver covers only that occurrence, comes only from an explicit user statement in this conversation, and is never inferred from silence, from advice, or from a request to continue.
- This conflict exception covers factual claims only: a finding changes a claim only when the sentence's truth conditions change. Rhetorical emphasis, evaluative adjectives, and announcement crutches (perfect, genuinely, exactly, cutting-edge) are style, not claims; fix them by naming the concrete thing, even though the sentence reads weaker afterwards. "Removing this word weakens the sentence" is never by itself a reason to escalate.
- When the user directs a rewording that keeps the flagged claim, record the row as waived, never as resolved: the scanner merely stopped matching, and the ledger must say the owner kept the claim.
- If the user wants new substance, keep it outside the Hogwash rewrite cycle. Ask them to update the original or start a separate content-editing task.

### Preserve proposition boundaries

- Preserve more than the general meaning. For every proposition, keep the same actor, action, object, referent, technical artefact, scope, modality, polarity, quantifier, time, sequence, condition, exception, cause, relationship, comparison, emphasis, and degree of certainty.
- Treat semantic qualifiers as substantive content. Words and phrases such as `may`, `might`, `can`, `would`, `must`, `only`, `always`, `never`, `under`, `when`, `taken literally`, and `depending on` cannot be added, removed, or substituted unless the resulting proposition is identical.
- Never broaden a claim from one question, component, example, or circumstance to a framework, system, category, or general rule. Never narrow one in the opposite direction. Preserve the original technical noun instead of replacing it with a broader near-synonym.
- Treat every new sentence, heading, callback, transition, synthesis, and summary as a claim that needs direct support in the original. Combining two source passages must not create a new conclusion, implication, causal link, comparison, or degree of emphasis.
- Prefer the smallest local edit that resolves a finding. Rewrite a whole paragraph or document only when necessary, because larger rewrites increase the chance of semantic drift.

### Judge a textual diff

- After every autonomous or user-directed edit pass, run a textual diff and read it. Use this command from the project directory, and read its output rather than a graphical viewer:

  ```sh
  git diff --no-index --word-diff=plain <original> <candidate>
  ```

  Opening a graphical diff without judging it, comparing from memory, preserving the gist, or relying on a scanner is not verification.
- Judge fluency as well as fidelity. Read every changed sentence on its own. If the smallest local edit left a strained clause or a circular statement, rewrite that whole sentence instead of shipping the patch.
- Judge structure as well as propositions. Keep the original's paragraph boundaries and sentence-length spread unless a specific finding or profile rule forces the change. Splitting paragraphs or evening sentences out across the document is a rewrite defect, not a fix.
- Audit every changed or added sentence and heading against the original passage that supports it. Check every proposition boundary above. Remove or correct anything that cannot be traced directly to the original.
- Run and judge the textual diff again immediately before the review gate and immediately before acceptance. A clean scan proves only that the scanner found no actionable patterns. It never proves source fidelity.
- Do not report source-fidelity compliance while any scope, modality, qualifier, technical referent, relationship, emphasis, or degree of certainty has changed. Report the exact mismatch instead.

## Validate the project

Before any workflow action, read `hogwash.json` when it exists and confirm that all three `profile` paths exist and contain text. Resolve each relative path in the project first; when the file is not there, resolve the same path under the shared root (for example `profiles/default/voice.md` becomes `$IDIOLECT_HOME/profiles/default/voice.md`, or `~/.idiolect/profiles/default/voice.md` when the variable is unset). A profile counts as present when either copy exists; the project copy wins when both do. Confirm that `workflow.maxPasses` is a positive integer.

A missing `hogwash.json` is not an error: the defaults apply, and this validation continues against the default profile paths. Only in this no-config default mode does a scan-only run tolerate a missing ban list. When `hogwash.json` exists, the configured ban list file must resolve for every scan; a ban list with no bullets is allowed and produces a stderr note. The document rewrite workflow requires all three profiles to resolve in both modes. When a profile is missing everywhere, run `bun "$SKILL/scripts/hogwash.ts" init` to create the scaffold files (it preserves every profile that already exists), and suggest `/idiolect` for the real voice.

A malformed or schema-invalid `hogwash.json` stops the workflow. If reading the file fails or any Hogwash command reports a configuration error, report the exact error and ask the user to fix the configuration. Do not edit or bypass the configuration, create or resume a candidate, or continue with another workflow action.

## Pick the scanner register

The scanner knows exactly three registers (`technical`, `prose`, and `marketing`) and calibrates every stylometric baseline and rule weight per register. `hogwash.json` sets the project default. A document scanned under the wrong register gets skewed findings.

Before the first scan of a document, map its format to a scanner register:

- `technical`: architecture documents, ADRs, READMEs, API references, runbooks, specifications.
- `prose`: blog posts, essays, articles, emails, and other narrative or personal writing.
- `marketing`: landing pages, product copy, press releases, announcements.

When the mapped register differs from the project default, pass `--register <name>` on every scan of that document, and on `accept`. Use the same register for the baseline scan and every candidate rescan; changing it mid-loop makes the scans incomparable. When the format is unclear, use the project default and say so.

This choice calibrates the scanner only. The idiolect `registers/` overlays are a separate mechanism: they shape the rewrite voice per format, and their names are open-ended. The two line up by format, not by name: a `blog` overlay pairs with the `prose` scanner register.

## Rewrite one document

This is scrub mode, the default: remove machine artifacts and profile violations with the smallest faithful edits. When the user directs a voice transfer into the owner's voice, read [references/re-voice.md](references/re-voice.md) before the first pass; it overrides the minimal-edit rules and nothing else.

1. Run `bun "$SKILL/scripts/hogwash.ts" scan --baseline --output json --register <register> <original>`, using the register picked above. `--baseline` writes the report to `.hogwash/<stem>-baseline.json` and never overwrites one that already exists, so the frozen baseline survives context loss. If the file already existed, you are resuming: read it instead of the fresh output.
2. Treat the baseline file as the checklist. Never replace its rows or evidence with a later scan. Completion status is the only mutable column, and you keep it in your working notes: ID, rule, line and column, match, message, suggestion, actionable or advisory state, and completion status.
3. Create the candidate by copying the original, unless the candidate already exists. If it exists, resume it without copying over it. Reconstruct completion status against the resumed candidate and start a new autonomous pass budget. Always produce the candidate, even when the baseline has no actionable findings.
4. Rewrite only the candidate. Apply the baseline checklist, the voice profile, the combined quality and style rules, and the ban list within the source-fidelity boundary. If a `registers/` directory exists beside the voice profile, also read the overlay whose name matches the document's format (blog, email, tech-doc, ...); the overlay overrides the core voice where they differ. Match the profile's mechanics, not just its word choices: keep the writer's sentence-length spread instead of evening sentences out, and keep their punctuation, contraction, and pronoun habits.
5. Follow the idiolect self-check order when that skill is installed beside this one: read `$SKILL/../idiolect/references/apply.md` if it exists. If it does not, use this order: substance, bans, register fit, core mechanics, rhythm, attribution test.
6. Four rules keep machine signals out of the rewrite: never replace an unusual but correct word with a more common synonym; leave a sentence with no baseline finding and no profile violation exactly as it is, because uniform polish is itself a machine signal; vary how paragraphs move, because a claim-support-wrap shape repeated across paragraphs reads as machine even when sentence lengths vary; and delete an empty scaffold sentence outright instead of rewording it.
7. Verify every original actionable baseline row against the candidate. Run and judge the textual diff after every pass. Remove any introduced proposition and restore any removed, broadened, narrowed, strengthened, weakened, or imprecisely renamed proposition. Mark a row complete only when the candidate resolves that occurrence without breaking the profiles or source fidelity. A row is resolved only when the problem the message describes is gone from the passage. Applying a ban means rewriting the construction, never substituting the nearest look-alike token (a colon or spaced hyphen standing in for a banned em dash, italics standing in for a deleted emphasis phrase). A punctuation, synonym, or word-order swap that stops the pattern from matching while the flagged claim or construction survives does not resolve the row.
8. Run `bun "$SKILL/scripts/hogwash.ts" scan --output json --register <register> <candidate>` explicitly, with the same register as the baseline scan. Note the file's `fingerprint` from the JSON.
9. If the current scan contains actionable findings, rewrite the candidate and repeat from step 7. Waived findings are reported with `"waived": true` and are never actionable.

Advisory findings do not block completion. Handle each one inside the rewrite: fix it or leave it, and report the action in one line. Raise a review question only when the choice changes meaning, scope, or an author's claim, or when a profile and the source conflict. Never ask approval for an edit a hard ban already requires, and never ask approval for a routine style edit the profiles already mandate.

## Waive a finding

When the user explicitly waives one occurrence, record it so every later scan, the diff report, and the acceptance gate honour it:

```sh
bun "$SKILL/scripts/hogwash.ts" waive --rule <rule-id> --match "<matched text>" --reason "<the user's reason>" --line <line> <original>
```

The waiver lands in `.hogwash/waivers.json`, names the original, and also covers its candidate. It covers one occurrence: two identical matches need two waivers. The scan marks the finding `waived`, drops it from the density, and keeps it visible. Quote the user's statement in `--reason`. Never record a waiver for a construction the profiles already forbid, and never record one from silence, advice, or a request to continue.

## Stop a stuck loop

Each autonomous feedback cycle gets `workflow.maxPasses` rewrite passes. Creating or copying a candidate does not consume a pass. Each autonomous edit does. Stop earlier when two consecutive rescans of the candidate report the same `fingerprint` for the file: the fingerprint is a digest of the actionable findings as a multiset of rule and normalised match, so an unchanged fingerprint means the pass changed nothing the scanner cares about.

Advice is optional and off by default. When `workflow.advanced.enabled` is true, or the user asks for a consultation, read [references/advisers.md](references/advisers.md) and follow it; never invoke a consultant or subagent otherwise.

When a stopping condition fires with actionable findings, keep the original and candidate unchanged. Report the residual actionable findings, the completed and incomplete baseline rows, and any advice. Ask the user how to proceed.

## Put decisions to the user as choices

Whenever the workflow needs a user decision (the next step at a review gate, a claim-strength conflict and its possible waiver, a meaning-changing advisory question, or a polish-list fix), present it as a question with exactly three concrete options. The user picks one or types their own.

- When the harness has an interactive question tool (AskUserQuestion or equivalent), use it. Put the recommended option first and end its label with "(Recommended)". The harness adds the free-text "Other" choice itself, so never add a catch-all option of your own. One call may carry up to four questions; batch related decisions into one call.
- Without such a tool, write the same structure as text: the question, three numbered options with the recommendation first, and a fourth line inviting a typed alternative.
- Make every option a concrete action whose effect on the candidate is stated in the option itself. For wording decisions, quote the exact replacement text in the option, so picking it is picking the sentence.
- Every offered option must itself satisfy the proposition-boundary rules. Never offer wording that would make a neighbouring sentence false, add a causal link the source does not state, or otherwise smuggle in a change the rules forbid you from making directly.
- Never fire more than four questions per handoff. Fold the remainder into the polish list or the report.
- A picked option is a user-directed edit under the existing rules. Picking a "waive" option is an explicit owner waiver: record it with the `waive` command. An "accept the candidate" option may appear only at the review gate when every acceptance condition is already met, and picking it is an explicit acceptance request.

## Ask for review

When the current scan has no actionable findings, the final textual diff has been judged under the proposition-boundary rules, the candidate is source-faithful, and it follows every profile rule that can be satisfied without new information, ask the user to review the candidate, and put the next step to them as a choice question. The handoff format, the score block, and the polish list are in [references/review-gate.md](references/review-gate.md); the HTML redline is in [references/diff-report.md](references/diff-report.md). If `workflow.diff` is a configured `{ command, args, wait }` object, also offer `bun "$SKILL/scripts/hogwash.ts" diff <original>`; if it is `null`, do not offer it. Defer an early diff request until this review gate.

If the user requests revisions, edit only the candidate. The baseline file stays as it is. The user-directed edit does not consume an autonomous pass. Reset both the autonomous pass budget and the fingerprint history, then restart the explicit verification and rescan loop.

If the user asks to overwrite or accept early, explain that acceptance requires a final scan after review with no actionable findings. Keep the original unchanged. Do not bank that request as later approval.

## Accept the candidate

After the user reviews the current candidate and explicitly requests acceptance:

1. Judge the final textual diff once more under the proposition-boundary rules. If any proposition changed, report the mismatch and stop.
2. Run `bun "$SKILL/scripts/hogwash.ts" accept --approved --register <register> <original>`, with the same register as the baseline scan. The command rescans the candidate itself, honours the waivers file, and refuses with exit 1 when anything actionable remains; it never touches the original in that case.
3. If it refused, return to the rewrite loop without resetting the current pass budget. After the candidate is clean again, ask for review and obtain a new explicit acceptance request.
4. If it succeeded, report that the candidate replaced the original, that the sibling no longer exists, and that the frozen baseline was removed. Restate every waived row and the user statement that waived it.

Do not infer approval from silence, a clean scan, or a request to show a diff.
