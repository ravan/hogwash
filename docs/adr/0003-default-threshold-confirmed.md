# ADR 0003 — The default threshold stays at 40

Status: superseded by ADR 0006 (2026-08-27)

## Context

The rule-sources area took the default-on set from four packs to seven:
`excess-vocab`, `vale-ai-tells` and `slop-gate` joined
`wikipedia-signs`, `claudisms`, `humanize-core` and `stylometry`. Three packs
worth of new rules raise every measured density, so the shipped default
threshold of 40 could no longer be assumed calibrated: either it now sits too
close to the human control documents, or the positives have run so far ahead of
it that it says nothing.

The evaluation could not answer that question, because a `ClassScore` carried
only the list of documents over the threshold — a list derived from the
threshold it was meant to justify. Nor could it attribute precision to a pack:
a finding carries a rule id, not the pack the rule came from.

## Decision

1. The default threshold is **confirmed at 40, not moved**. Measured 2026-08-26
   against the eight default-on packs: the highest density any control document
   reached is 11.3 (`tests/fixtures/corpus/non-native-formal.md`), and the
   lowest density any positive document reached is 102.4
   (`tests/fixtures/eval/ai-lineage/prose.md`). 40 sits about 3.5× above the
   worst control and well under a third of the weakest positive.
2. The evaluation report records that band itself, in a `## Threshold` section
   derived from per-document densities, so the threshold and the band it sits in
   can never disagree.
3. The report also carries per-pack precision, rolled up from a rule-id to
   pack-name map built where the packs are selected.
4. The **precision floor** this area adopts: a rule that raised at least three
   spans across the corpus and scored precision below 0.50 is acted on.
   Exactly one rule met it — `connective.wordy`, 0 true positives against 4
   false, every one of them in a control document, its matches being ordinary
   formal and non-native English ("In terms of", "With regard to", "for the
   purpose of"). Of the three weight cuts the spec offers, the action taken is
   `advisory: true`: the rule keeps reporting, and stops counting toward
   density and the exit code.
5. Two rules sat above the floor and were left alone:
   `wiki.vocab.soft-technical` (4 true, 3 false, 0.57) and
   `opener.throat-clearing` (2 true, 1 false, 0.67).

## Consequences

- No configuration a user has written changes meaning: 40 is still 40.
- `connective.wordy` still appears in reports and still counts as a newly
  uncovered finding in `verify`, so the four pinned before-densities in the
  fix examples drop from 117.6 to 100.0.
- The two opt-in packs, `plain-english` and `antislop`, are outside this
  measurement: they are not in the default-on set being re-gated, so they get
  no precision row and contributed nothing to the band.
- The floor is now cheap to re-apply: any future pack import can be scored on
  the same corpus, per pack, before it is made default-on.
