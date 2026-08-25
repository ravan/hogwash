# ADR 0007 — The document pass runs first; the span pass cleans up after it

Status: superseded by ADR 0010 (2026-08-28).

## Context

ADR 0004 ordered the two passes of `hogwash fix` as span rewrites first, then
the whole-document rewrite. That order had a hole: the document pass ran last,
so nothing repaired what it missed or reintroduced. The post-fix rescan could
only report the damage. It also made the span pass's careful, caged edits
disposable — the document pass was free to rewrite right over them — and it left
the `applied` edits in `--output json` describing a text that no longer existed
on disk once the document pass applied.

## Decision

1. **The document pass runs first**, on the text as the scanner saw it. Its
   steering is unchanged: the rules that fired in the initial scan, the ban
   list, the voice sample, the quality document. The initial scan therefore
   stays where it was — it is cheap, local, and the steering needs it.

2. **A parseable document pass earns a rescan.** The span pass then works from a
   fresh lexical scan of the polished text, not from the pre-polish findings,
   whose offsets describe text that no longer exists. When the document pass is
   off, has no rule to steer it, or returned the text unchanged, the original
   findings drive the span pass exactly as before. A stopped document pass runs
   no span pass (ADR 0009).

3. **The span pass runs last**, so every tell the scanner can still name gets a
   targeted, span-caged fix, and the `applied` edits' rebased offsets describe
   the text written to disk. The ADR 0004 caveat about stale offsets is gone.

4. **Interactive review follows the pass order**: the document-pass question
   comes first, the span review after it.

5. **What the rescan cannot carry**: a finding that came from
   `--from-report` and no longer matches. It reaches the span pass only when
   the document pass did not change the text; when it did, the whole-document
   rewrite was itself steered by that finding's rule. The rescan runs every
   scanner, so stylometric and structural findings are measured again — the
   span pass ignores them, but the delta below needs them.

6. **The rule packs act as the ban list.** The document cage scans the rewrite
   with the lexical rules and warns when it introduces a wording a rule
   matches that the original text did not already hold — counted per wording,
   so a term of art the document already uses ("the real user ID") survives,
   but the fixer should not add a new one. The warning names the rule and the
   wording, and that is what the one retry is told. Advisory rules are exempt:
   an advisory hit is a question for the writer — weight 0, fails no build — so
   it refuses no rewrite either. The first evaluation without the exemption
   dropped three of four document passes over ordinary verbs ("carries",
   "holds", "lives") from `loose.carve-out-vocabulary`. What the pass
   introduces against advisory rules stays visible in the polish delta, and a
   writer who does want a specific wording hard-refused can put it in their ban
   list, which the cage has always enforced. This replaced the first idea,
   hand-copying the offending wordings into a banned list: the top offenders
   (`loose.reality-qualifier`, `loose.carve-out-vocabulary`) are advisory
   patterns whose words have honest technical senses, so a static ban would
   refuse legitimate uses.

7. **The two scans are compared and reported.** An applied document pass earns
   a `polishDelta`: per rule, how many findings the rewrite removed and how
   many it introduced.
   The fix prints it after `polish: applied`, `--output json` carries it as
   `polish.delta`, and the evaluation report sums it per rule in a
   `## Document pass effect` section. A rule that keeps appearing under
   `introduced` names a habit of the fixer itself — that is the tuning signal.

## Consequences

- Broad brush first, scalpel second: the document pass takes the big swing, the
  span pass repairs what it left, and the final verify scan measures the real
  result. Nothing edits the text after the last targeted fix.
- The span pass gets cheaper on polished documents: fewer surviving findings
  means fewer agent span requests.
- The document pass now works on dirtier text, so it has more to change and
  slightly more chance of a cage violation; the one named retry from ADR 0004
  is unchanged.
- Two scans per fixed document instead of one (the steering scan and the
  post-polish rescan), both local and deterministic.
