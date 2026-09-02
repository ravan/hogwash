# 11. Waivers, the baseline and the acceptance gate live on disk

Date: 2026-09-02

## Status

Accepted

## Context

The rewrite loop kept three things only in the agent's context: the frozen baseline checklist, the owner's waivers, and the "same findings twice" stop rule. Every rescan overwrote `.hogwash/report.json`, so `report --md` showed the last candidate scan, never the baseline. A waiver granted in conversation was invisible to the scanner, so `accept` could not verify anything and renamed the candidate blind. Context compaction lost all three.

## Decision

- `scan --baseline` writes `.hogwash/<stem>-baseline.json` once per original and never overwrites it. `accept` removes it.
- `waive` records one owner waiver per occurrence in `.hogwash/waivers.json`. The scan marks a matching finding `waived`, gives it no weight, and keeps it visible. A waiver names the original and also covers its candidate.
- Each file report carries a `fingerprint`: a digest of the actionable findings as a multiset of rule and normalised match. The stop rule compares fingerprints.
- `accept` rescans the candidate in memory with the waivers applied and refuses with exit 1 when anything actionable remains.
- The report version moves to 7 for the two new fields.

## Consequences

The agent still owns the judgment (which rows are resolved, whether the diff is faithful), but the evidence it judges against is on disk and survives a lost context. A waiver has an audit trail with the owner's reason. `accept` can no longer replace an original that still fails the scan.
