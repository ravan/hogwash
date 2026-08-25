# ADR 0002 — Sync writes pack edits to the working tree

Status: accepted (2026-08-26)

## Context

The v1 sync wrote only a snapshot and a proposal file; a human folded accepted
rules into the pack by hand (spec §3.4.4, README "the sync never edits a rule
pack itself"). The rule-sources area adds six packs and up to nine upstream
sources. At that scale the hand-fold step is the weakest link: it is where
transcription drift and typos enter, and it makes "keep hogwash up to date
automatically" impossible, because the automated part stops one step short of
the artifact that matters.

Parent invariant §6.11 says rule-pack changes land only as reviewed git diffs.
The invariant constrains what may be *committed*, not what a tool may write to
the working tree.

## Decision

1. The sync applies accepted edits directly to the target `rules/<pack>.json`
   in the working tree, through the pack schema validator (the written file
   must round-trip `loadPack`), with stable formatting so the diff stays
   reviewable.
2. The proposal file remains, as the audit trail of accepted and rejected
   edits with reasons.
3. The sync never commits, pushes, or tags. The human commit (or PR merge) is
   the gate; §6.11 is preserved, sharpened from "human folds by hand" to
   "human reviews one git diff".
4. Scheduled CI may run the sync and open a PR containing the sync's
   working-tree output. Merging that PR is the same human gate.

## Consequences

- Review effort drops to reading one diff; the transcription step and its
  error class disappear.
- Prompt-injection blast radius is unchanged: agent-drafted text still reaches
  the repository only through a human-reviewed diff, and the raw-body
  injection scan still runs before any parsing.
- Any tool or document claiming the sync never edits packs is now wrong;
  README §Rule sync is updated in rule-sources-S0.
- Full auto-commit remains forbidden; allowing it would supersede this ADR and
  contradict spec §6.11.
