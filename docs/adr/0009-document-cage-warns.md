# ADR 0009 — The document cage warns; the scanner gets the rewrite

Status: superseded by ADR 0010 (2026-08-28).

## Context

The document cage used to discard a whole-document rewrite after two violations
and silently hand the original document to the span pass. The terminal reported
the dropped polish, but the pipeline no longer measured or repaired the text the
document model actually produced. A preservation warning such as a missing name
therefore changed the input to pass 2 instead of remaining an observation about
pass 1.

That fallback breaks the two-pass contract. The span pass exists to rescan and
repair the document pass. It cannot do that when a cage warning swaps the
document pass output for the original text.

## Decision

1. **A document-cage violation is a warning, not a gate.** Hogwash logs the
   attempt number and violation as soon as the cage finds it.
2. **One repair retry remains available.** `--yes` starts it automatically;
   interactive mode lets the writer retry or stop. Both attempts receive the
   original document, every unique rule from the initial scan, and every
   original finding in the span pass's `Rule` / surrounding context /
   `<<<SPAN` shape. The retry also receives every warning from the first
   rewrite so it can repair the full set in one response.
3. **The latest parseable rewrite survives model trouble.** If a repair reply
   is unusable after an earlier parseable rewrite, the earlier rewrite becomes
   the input to the full rescan and span pass. A repeated cage warning also
   continues with the latest parseable rewrite.
4. **Only no parseable response or explicit writer rejection stops the
   pipeline.** With no parseable response after both attempts, or when the
   writer answers no to either interactive polish choice, Hogwash skips the
   span pass for that document, leaves its original file untouched, writes the
   original scan findings to the report, and exits nonzero. No rule firing is
   not a stop: the span pass continues from the original text.
5. **A rejected candidate remains inspectable.** When the writer rejects a
   parseable rewrite, Hogwash writes it beside the original as
   `<stem>.polish-rejected<extension>`, adding a numeric suffix rather than
   overwriting an existing artifact. With no parseable response there is no
   candidate to save.
6. **Every attempt stays visible.** Terminal output names the attempt number,
   whether it warned or was unusable, and whether Hogwash retries, continues,
   or stops. `polish: warned` remains an applied JSON outcome with the warning
   carried separately.
7. **Final verification is unchanged.** Density, new findings, voice, and
   preservation remain scanner-owned outcomes after both rewrite passes.

## Consequences

- Every parseable document-pass result is measured by the same scanner and span
  pass that measure a clean result.
- The span pass receives fresh offsets from the warned rewrite instead of stale
  offsets from the original document.
- A cage warning may reach disk when the span pass cannot repair it. The final
  verification and `--diff` make that damage visible; the cage no longer hides
  it by changing which document the pipeline evaluates.
- The one repair retry remains useful prompt feedback without deciding pipeline
  control flow.
- A stopped run is deliberately a repair state: the original report and any
  rejected parseable candidate give the writer both versions to judge.
