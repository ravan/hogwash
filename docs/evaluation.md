# hogwash scanner evaluation

Generated 2026-08-30T19:33:00.326Z.

## Corpus classes

| class | kind | documents | words | false positives / 1000 words | over threshold |
| --- | --- | --- | --- | --- | --- |
| ai-dense | positive | 1 | 277 | 0.00 | tests/hogwash/fixtures/corpus/ai-dense.md |
| ai-subtle | positive | 1 | 224 | 0.00 | tests/hogwash/fixtures/corpus/ai-subtle.md |
| ai-lineage | positive | 1 | 212 | 0.00 | tests/hogwash/fixtures/eval/ai-lineage/prose.md |
| ai-claude | control | 3 | 830 | 0.00 | — |
| ai-gpt | positive | 2 | 1106 | 0.00 | tests/hogwash/fixtures/eval/ai-gpt/essay-1.md, tests/hogwash/fixtures/eval/ai-gpt/essay-2.md |
| pastiche-technical | control | 2 | 526 | 0.00 | — |
| human-article | control | 1 | 342 | 2.92 | — |
| human-mail | control | 1 | 607 | 1.65 | — |
| human-marketing | control | 1 | 570 | 15.79 | — |
| human-edited-draft | control | 1 | 444 | 0.00 | — |
| pastiche-non-native | control | 1 | 353 | 2.83 | — |
| hape-human | control | 4 | 1943 | 0.00 | — |
| hape-gpt4o | stylometric-positive | 4 | 2148 | 0.00 | tests/hogwash/fixtures/eval/hape-gpt4o/acad-0005.md, tests/hogwash/fixtures/eval/hape-gpt4o/news-0002.md |
| hape-llama3 | stylometric-positive | 4 | 2103 | 0.00 | — |

## Threshold

- shipped default: 25
- highest control density: 23.6 (tests/hogwash/fixtures/eval/ai-claude/marketing.md)
- lowest positive density: 2.5 (tests/hogwash/fixtures/eval/hape-llama3/news-0011.md)

## Per-rule precision

| rule | true | false | missed | precision | recall |
| --- | --- | --- | --- | --- | --- |
| `attribution.weasel` | 5 | 0 | 0 | 1.00 | n/a |
| `ban/delve` | 2 | 0 | 0 | 1.00 | n/a |
| `ban/entry` | 6 | 0 | 0 | 1.00 | n/a |
| `ban/highlights` | 2 | 0 | 0 | 1.00 | n/a |
| `ban/leverage` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/meticulous` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/showcases` | 4 | 0 | 0 | 1.00 | n/a |
| `ban/underscores` | 4 | 0 | 0 | 1.00 | n/a |
| `closer.chatbot` | 1 | 0 | 0 | 1.00 | n/a |
| `conclusion.fluff` | 3 | 0 | 0 | 1.00 | n/a |
| `declarative.vague-stakes` | 1 | 0 | 0 | 1.00 | n/a |
| `hedge.stack` | 2 | 1 | 0 | 0.67 | n/a |
| `jargon.business` | 1 | 0 | 0 | 1.00 | n/a |
| `loose.carve-out-vocabulary` | 25 | 3 | 0 | 0.89 | n/a |
| `loose.force-verbs` | 1 | 0 | 0 | 1.00 | n/a |
| `loose.reality-qualifier` | 6 | 0 | 0 | 1.00 | n/a |
| `loose.totalising` | 2 | 0 | 0 | 1.00 | n/a |
| `loose.wiki-ai-words` | 13 | 0 | 0 | 1.00 | n/a |
| `marketing.buzzword` | 3 | 0 | 0 | 1.00 | n/a |
| `meta.commentary` | 1 | 0 | 0 | 1.00 | n/a |
| `opener.era-framing` | 2 | 0 | 0 | 1.00 | n/a |
| `opener.throat-clearing` | 2 | 2 | 0 | 0.50 | n/a |
| `residue.collaborative-turn` | 1 | 0 | 0 | 1.00 | n/a |
| `residue.oaicite` | 1 | 0 | 0 | 1.00 | n/a |
| `rhetoric.setup` | 1 | 0 | 0 | 1.00 | n/a |
| `rhythm.lexical-diversity` | 7 | 0 | 0 | 1.00 | n/a |
| `rhythm.opener-repetition` | 6 | 0 | 0 | 1.00 | n/a |
| `rhythm.punctuation-density` | 3 | 0 | 0 | 1.00 | n/a |
| `rhythm.sentence-uniformity` | 26 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.bustling` | 1 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.elevate` | 2 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.embark` | 2 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.empower` | 1 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.furthermore` | 3 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.moreover` | 3 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.unlock` | 2 | 0 | 0 | 1.00 | n/a |
| `tic.hype-vocabulary` | 4 | 0 | 0 | 1.00 | n/a |
| `tic.participial-tail` | 3 | 0 | 0 | 1.00 | n/a |
| `tic.staccato-negation` | 8 | 0 | 0 | 1.00 | n/a |
| `tic.value-claim` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.a-cornerstone-of` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.at-the-forefront` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.delicate-balance` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.double-edged-sword` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.tip-of-the-iceberg` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.filler-phrases.a-variety-of` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.filler-phrases.a-wide-range-of` | 2 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.by-contrast` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.equally-important` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.for-example` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.for-instance` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.in-addition` | 2 | 1 | 0 | 0.67 | n/a |
| `vale.formal-transitions.in-contrast` | 2 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.in-particular` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.hedging-phrases.raises-questions-about` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.promotional-puffery.at-the-heart-of` | 2 | 0 | 0 | 1.00 | n/a |
| `vale.promotional-puffery.continues-to-evolve` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.promotional-puffery.left-a-lasting-impact` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.restatement-markers.more-specifically` | 1 | 0 | 0 | 1.00 | n/a |
| `wiki.formatting.bold-term-bullet` | 3 | 0 | 0 | 1.00 | n/a |
| `wiki.formatting.emoji-heading` | 1 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.challenges-outlook` | 2 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.copula-avoidance` | 10 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.negative-parallelism` | 12 | 1 | 0 | 0.92 | n/a |
| `wiki.structure.significance-claim` | 3 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.significance-participle` | 6 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.summary-opener` | 4 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.ai-vocabulary` | 4 | 1 | 0 | 0.80 | n/a |
| `wiki.vocab.promotional` | 2 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.soft-technical` | 7 | 1 | 0 | 0.88 | n/a |
| `wiki.vocab.spike-adjectives` | 11 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.spike-nouns` | 8 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.spike-verbs` | 3 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.additionally` | 0 | 1 | 0 | 0.00 | n/a |
| `xv.vocab.advancement` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.align` | 2 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.alongside` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.capabilities` | 2 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.dependable` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.encapsulates` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.endeavors` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.enduring` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.formidable` | 2 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.imperative` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.innovative` | 0 | 1 | 0 | 0.00 | n/a |
| `xv.vocab.insights` | 6 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.integrating` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.necessity` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.notable` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.offering` | 2 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.poses` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.pressing` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.shedding` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.strategically` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.swiftly` | 1 | 0 | 0 | 1.00 | n/a |

## Per-pack precision

| pack | rules raised | true | false | precision |
| --- | --- | --- | --- | --- |
| wikipedia-signs | 16 | 90 | 3 | 0.97 |
| claudisms | 9 | 51 | 3 | 0.94 |
| humanizer | 11 | 22 | 3 | 0.88 |
| stylometry | 4 | 42 | 0 | 1.00 |
| excess-vocab | 22 | 29 | 2 | 0.94 |
| vale-ai-tells | 19 | 23 | 1 | 0.96 |
| slop-gate | 7 | 14 | 0 | 1.00 |
| unslop | 0 | 0 | 0 | n/a |
