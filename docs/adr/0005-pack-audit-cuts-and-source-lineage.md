# ADR 0005 — Pack audit: cut the dead weight, re-source the lineages

Status: accepted (2026-08-27)

## Context

An audit of every rule pack and sync source measured each pack's contribution
on the evaluation corpus and each upstream's health (stars, activity, licence).
Three packs contributed nothing or worse:

- `antislop` (130 rules): fiction phrases ("heart pounded in her chest").
  Zero findings on any corpus document, human or AI. It cannot fire on the
  technical and marketing prose hogwash scans.
- `plain-english` (289 rules): a plainness style guide, not an AI-tell list.
  Its signal was inverted — 9 findings on the 3 human control documents against
  2 on the 3 AI documents. Upstream (retextjs/retext-simplify) dormant since 2023.
- `delve-focal-words` source (fed `excess-vocab`): 1-star academic one-off; its
  only distinctive word, "delve", is already covered by `wiki.vocab.delve`.
  No rule it proposed was ever applied.

Two rules were measurably noisy: `connective.wordy` (0/4 precision — every hit
was human formal English) and `wiki.vocab.soft-technical` (0.57 — "robust" and
"comprehensive" fired on human prose).

`humanize-core` cited two near-zero-star derivative repos while the widely used
original, blader/humanizer (38k stars, MIT), sat vendored in `refs/` without a
sync lineage.

## Decision

1. Delete the `antislop` and `plain-english` packs and sync sources.
2. Delete the `delve-focal-words` sync source.
3. Make blader/humanizer the prose sync source for `humanize-core`.
4. Add the pstack `unslop` skill (cursor/plugins, MIT) as a prose source feeding
   a new `unslop` lineage pack, seeded with its abstract-metaphor-noun jargon
   list — the one pattern set no existing pack covered. The pack is on by default.
5. Narrow instead of deprecate the two noisy rules: `connective.wordy` loses
   "in terms of", "with regard to" and "for the purpose of" (humanize-core 0.2.0);
   `wiki.vocab.soft-technical` loses "robust" and "comprehensive"
   (wikipedia-signs 0.3.0). Narrowing keeps the strong phrases and their
   replacement tables; deprecation would have thrown them away.
6. Keep `vale-ai-tells` and watch it: 861 rules, ~475 KB, only 8 ever raised on
   the corpus — but zero measured false positives and a healthy upstream.
   Revisit once the corpus is large enough to judge its long tail.

## Corpus growth

The five empty corpus classes were filled from the sources the AI-detection
community most commonly uses, licence-checked (see
`tests/fixtures/eval/CORPUS_LICENSES.md`): ghostbuster-data ChatGPT essays
(CC BY 3.0) for `ai-gpt`, a pre-2023 Wikipedia introduction (CC BY-SA) for
`human-article`, an Enron business email (public record) for `human-mail`, a
2019 SEC 8-K press release for `human-marketing`, and a Beemo expert-edited
LLM draft (MIT) for `human-edited-draft`. Sources evaluated and rejected:
BAWE (redistribution forbidden), M4GT (no licence, Google Drive), CoAuthor
(no licence), RAID/MAGE human excerpts (packaging licence is not a copyright
grant on the underlying text).

`ai-gpt` is a positive class: the scanner must flag dated GPT prose.

## Consequences

- ~420 rules and ~350 KB of pack data are gone with no measured loss.
- Every corpus class is collected; the eval gate now covers marketing and mail.
- Known recall gap, recorded honestly: 5 of 8 sampled ghostbuster ChatGPT
  essays scored under the shipped threshold of 40 (as low as 8.8). The
  threshold, or the era coverage of the lexical packs, needs work before the
  scanner can claim to catch ordinary GPT-3.5 prose. Tracked for a future slice.
- `human-marketing` shows the highest control false-positive rate
  (28 / 1000 words) — promotional vocabulary rules read human marketing copy
  as machine prose. Watch `loose.wiki-ai-words` (0.56 precision) as the corpus
  grows; it is the next cut candidate.
