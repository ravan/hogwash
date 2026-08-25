# ADR 0008 — The judge is removed; every check is deterministic

Status: compatibility fields superseded by ADR 0010 (2026-08-28). The deterministic scanner decision remains accepted.

## Context

Five rules ran on the `judge` engine: an agent read a section and quoted the
spans that matched. Four of them named semantic tells — manufactured stakes,
false agency, the rhythmic rule of three, a sentence that gestures at
significance. One named a formatting tell: a heading in Title Case where the
rest of the document uses sentence case.

The judge cost an agent round-trip per section, per family, and its findings
could never be measured. A judge finding lives only in a stored report; a
rescan cannot see it, so the document pass could not count it as fixed
(`polishDelta` excluded the whole engine). The jury's confidence machinery —
tiers, votes, self-report, the cross-family agreement rule — existed to decide
whether a judge finding was real at all.

Meanwhile the fixer's document pass already carries the writer's quality
document verbatim into its prompt, on every run.

## Decision

1. **The four semantic rules move into the quality document.** They are
   restated as instructions to a writer rather than to a detector, each with
   the rule's own bad/good example pair. `skills/hogwash/templates/quality-template.md`
   ships them, so every generated profile carries them. The document pass now
   steers away from these tells on every run, instead of only when a judge saw
   one first.

2. **The title-case heading rule becomes a deterministic check.** A new
   `structural` engine runs whole-document checks in code. Its one check,
   `title-case-heading`, fires on a heading whose words are capitalised one by
   one in a document that has at least one sentence-case heading. It could not
   move into the quality document: the document pass is forbidden to change a
   heading's wording, so quality text could never fix it.

3. **The ban list becomes lexical.** Each bullet was a judge rule; it is now a
   regular expression — the escaped term, case-insensitive, guarded by word
   boundaries. Bans are now reported by `hogwash scan` rather than needing an
   agent run. An inflection the writer also wants banned is its own bullet.

4. **The `judge` command, the `AgentAdapter.judge` method, the cage prompt, the
   chunker, the quote locator, the vote merge and the eval harness's jury
   scoring are deleted.** The adapters stay: `fix` still uses them to rewrite.

5. **The caged-word guard survives, with a new subject.** `CAGED_WORDS` moves
   to `src/rules/caged.ts`. It guards a drafted rule's id and examples, because
   those are quoted into the document-pass prompt. A rule's `message` is no
   longer checked: it describes the tell to a reader, so "rewrite" belongs
   there.

## Consequences

- Nothing in hogwash asks a model whether a finding is real. The scanner is the
  only detector, and it is reproducible.
- What is lost is reporting, not measurement: these four tells no longer appear
  in a report, in the density, or in the CI exit code. The delta could never
  count them anyway.
- A document whose only slop is one of the four semantic tells now trips no
  rule, so the document pass does not run on it. Almost every such document
  also trips a lexical rule, so the gap is narrow — but it is real.
- `tier`, `votes`, `selfReport` and `agents` stay in the report schema. Every
  scanner finding is `confirmed`, voted by `scanner`, never self-reported, and
  `agents` is always empty. They are kept so a stored report still parses and
  `--tier` still means something; a later ADR may retire them.
- Points 2 and 4 of ADR 0001 still hold: the source model is declared, never
  detected, and the fixer defaults to a family that is not the source model's
  own.
