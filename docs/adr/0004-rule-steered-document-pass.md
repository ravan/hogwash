# ADR 0004 — The fixer gets a second, whole-document pass

Status: superseded by ADR 0010 (2026-08-28).

## Context

`hogwash fix` rewrote one flagged span at a time. Each span went to the agent on
its own, inside the §6.6 cage, and came back as a replacement string. The result
is correct and it is safe, and it reads like search-and-replace: the machine
habits the scanner cannot name — the even sentence lengths, the three-item
rhythm, the paragraph that restates its own first line — survive untouched,
because no single span holds them.

The same design cost time and money. `resolveTargets` awaited one agent call per
finding, in series. Every call is a fresh session by ADR 0001.1: the Claude
adapter opens a new SDK session, and the codex adapter spawns a whole new
`codex app-server` process. Each call also resent the ban list and the voice
sample. A 36-finding document was about 30 serial sessions carrying the same
preamble 30 times.

## Decision

1. **The span pass is batched.** `AgentAdapter` gains `rewriteBatch`, which
   sends up to `BATCH_LIMIT` (20) spans in one call: the hard limits, the ban
   list and the voice sample stated once, then one numbered span per entry. The
   reply names an id per span, so each span is still validated on its own by the
   checks that were always there — unchanged, stray newline, `checkPreservation`.
   A reply that cannot be read at all costs the chunk one retry, then every span
   in it is `unusable`. The single-span `rewrite` stays on the adapter, because
   the evaluation harness measures the fixer through it.

2. **A second pass rewrites the whole document**, behind the new `--polish`
   flag. Default behaviour does not change. Pass 2 receives the pass-1 text and
   rewrites it once.

3. **The steering is assembled from the rule packs, not authored.** For each
   rule that fired in this document, `steeringFor` takes the rule's own
   `message` and the first `examples.matching` / `examples.clean` pair as an
   avoid/prefer line. Nothing in `polish.ts` states
   what good prose is; the packs already do, and the fixer is told the same
   thing the report tells the reader.

4. **A voice sample is secondary.** `--voice` stays optional and feeds both
   passes. Most runs have none, and the pass must be worth running without one.

5. **A deterministic cage inspects the result.** `cagePolish` checks the heading
   sequence, `checkPreservation` (names, numbers, quotations, code, links), a
   length ratio inside 0.5–1.5, and that no banned wording came back. Per ADR
   0009 these checks warn and steer a repair attempt; they do not gate a
   parseable rewrite.

6. **The scanner still verifies.** The post-fix rescan and `verifyFix` run over
   the polished text exactly as before: density must drop and no new rule may
   fire. ADR 0001 holds — the fixer proposes, the deterministic scanner
   disposes.

7. **A cage warning costs one retry**, with every warning named in the prompt.
   Per ADR 0009 a repeated warning continues with the parseable document. Only
   two unusable replies or an explicit writer rejection stops the pipeline.

## Consequences

- A 36-finding run makes 2 span calls instead of about 30, plus one call for the
  document pass. For codex that is 3 spawned processes instead of 30.
- The `applied` edits in `--output json` describe **pass 1 only**. Their
  `rebasedStart` / `rebasedEnd` offsets are offsets into the pass-1 text; when
  the document pass applies, the file on disk no longer matches them. A caller
  that needs offsets into the written file must rescan it — which is what the
  post-fix report in the same JSON document already is.
- `--diff` shows both passes together, because the pre-fix copy is taken before
  either pass runs.
- Interactive review asks once per document, after the span review, before the
  polished text is kept. `--yes` accepts it.
- The document pass is skipped when no rule fired in the file: there would be
  nothing to steer it with.
- Every adapter must now answer `rewriteBatch` and `polish`. Both come free
  from `createCagedAdapter`, so a new family is still one `AgentQuery`.
