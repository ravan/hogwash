# hogwash scanner evaluation

Generated 2026-08-28T09:18:34.519Z.

## Corpus classes

| class | kind | documents | words | false positives / 1000 words | over threshold |
| --- | --- | --- | --- | --- | --- |
| ai-dense | positive | 1 | 277 | 0.00 | tests/fixtures/corpus/ai-dense.md |
| ai-subtle | positive | 1 | 224 | 0.00 | tests/fixtures/corpus/ai-subtle.md |
| ai-lineage | positive | 1 | 212 | 0.00 | tests/fixtures/eval/ai-lineage/prose.md |
| ai-claude | control | 3 | 830 | 0.00 | — |
| ai-gpt | positive | 2 | 1106 | 0.00 | tests/fixtures/eval/ai-gpt/essay-1.md, tests/fixtures/eval/ai-gpt/essay-2.md |
| human-technical | control | 2 | 526 | 0.00 | — |
| human-article | control | 1 | 342 | 2.92 | — |
| human-mail | control | 1 | 607 | 1.65 | — |
| human-marketing | control | 1 | 570 | 15.79 | — |
| human-edited-draft | control | 1 | 444 | 0.00 | — |
| non-native-formal | control | 1 | 353 | 2.83 | — |

## Threshold

- shipped default: 25
- highest control density: 17.0 (tests/fixtures/corpus/non-native-formal.md)
- lowest positive density: 47.7 (tests/fixtures/eval/ai-gpt/essay-1.md)

## Per-rule precision

| rule | true | false | missed | precision | recall |
| --- | --- | --- | --- | --- | --- |
| `attribution.weasel` | 5 | 0 | 0 | 1.00 | n/a |
| `ban/cutting-edge` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/delve` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/furthermore` | 3 | 0 | 0 | 1.00 | n/a |
| `ban/in-today-s-fast-paced-world` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/landscape` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/leverage` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/moreover` | 2 | 0 | 0 | 1.00 | n/a |
| `ban/realm` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/robust` | 2 | 0 | 0 | 1.00 | n/a |
| `ban/seamless` | 1 | 0 | 0 | 1.00 | n/a |
| `ban/unlock` | 2 | 0 | 0 | 1.00 | n/a |
| `closer.chatbot` | 2 | 0 | 0 | 1.00 | n/a |
| `conclusion.fluff` | 3 | 0 | 0 | 1.00 | n/a |
| `declarative.vague-stakes` | 1 | 0 | 0 | 1.00 | n/a |
| `hedge.stack` | 2 | 1 | 0 | 0.67 | n/a |
| `loose.carve-out-vocabulary` | 5 | 3 | 0 | 0.63 | n/a |
| `loose.force-verbs` | 1 | 0 | 0 | 1.00 | n/a |
| `loose.reality-qualifier` | 2 | 0 | 0 | 1.00 | n/a |
| `loose.totalising` | 2 | 0 | 0 | 1.00 | n/a |
| `loose.wiki-ai-words` | 8 | 0 | 0 | 1.00 | n/a |
| `marketing.buzzword` | 3 | 0 | 0 | 1.00 | n/a |
| `meta.commentary` | 1 | 0 | 0 | 1.00 | n/a |
| `opener.era-framing` | 1 | 0 | 0 | 1.00 | n/a |
| `opener.throat-clearing` | 2 | 2 | 0 | 0.50 | n/a |
| `residue.oaicite` | 1 | 0 | 0 | 1.00 | n/a |
| `rhetoric.setup` | 1 | 0 | 0 | 1.00 | n/a |
| `rhythm.contraction-rate` | 19 | 0 | 0 | 1.00 | n/a |
| `rhythm.punctuation-density` | 5 | 0 | 0 | 1.00 | n/a |
| `rhythm.sentence-uniformity` | 3 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.bustling` | 1 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.elevate` | 2 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.embark` | 2 | 0 | 0 | 1.00 | n/a |
| `slop.vocabulary.empower` | 1 | 0 | 0 | 1.00 | n/a |
| `tic.em-dash` | 6 | 0 | 0 | 1.00 | n/a |
| `tic.hype-vocabulary` | 3 | 0 | 0 | 1.00 | n/a |
| `tic.participial-tail` | 1 | 0 | 0 | 1.00 | n/a |
| `tic.staccato-negation` | 4 | 0 | 0 | 1.00 | n/a |
| `tic.value-claim` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.a-cornerstone-of` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.at-the-forefront` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.delicate-balance` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.double-edged-sword` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.ai-compound-phrases.tip-of-the-iceberg` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.equally-important` | 1 | 0 | 0 | 1.00 | n/a |
| `vale.formal-transitions.in-addition` | 0 | 1 | 0 | 0.00 | n/a |
| `vale.promotional-puffery.continues-to-evolve` | 1 | 0 | 0 | 1.00 | n/a |
| `wiki.formatting.bold-term-bullet` | 3 | 0 | 0 | 1.00 | n/a |
| `wiki.formatting.emoji-heading` | 1 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.challenges-outlook` | 2 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.copula-avoidance` | 7 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.negative-parallelism` | 5 | 1 | 0 | 0.83 | n/a |
| `wiki.structure.significance-claim` | 2 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.significance-participle` | 6 | 0 | 0 | 1.00 | n/a |
| `wiki.structure.summary-opener` | 4 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.ai-vocabulary` | 2 | 1 | 0 | 0.67 | n/a |
| `wiki.vocab.promotional` | 2 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.soft-technical` | 4 | 1 | 0 | 0.80 | n/a |
| `wiki.vocab.spike-adjectives` | 8 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.spike-nouns` | 3 | 0 | 0 | 1.00 | n/a |
| `wiki.vocab.spike-verbs` | 6 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.additionally` | 0 | 1 | 0 | 0.00 | n/a |
| `xv.vocab.advancement` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.align` | 2 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.capabilities` | 2 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.innovative` | 0 | 1 | 0 | 0.00 | n/a |
| `xv.vocab.insights` | 2 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.shedding` | 1 | 0 | 0 | 1.00 | n/a |
| `xv.vocab.swiftly` | 1 | 0 | 0 | 1.00 | n/a |

## Per-pack precision

| pack | rules raised | true | false | precision |
| --- | --- | --- | --- | --- |
| wikipedia-signs | 15 | 63 | 3 | 0.95 |
| claudisms | 10 | 26 | 3 | 0.90 |
| humanizer | 10 | 21 | 3 | 0.88 |
| stylometry | 3 | 27 | 0 | 1.00 |
| excess-vocab | 8 | 9 | 2 | 0.82 |
| vale-ai-tells | 8 | 7 | 1 | 0.88 |
| slop-gate | 4 | 6 | 0 | 1.00 |
| unslop | 0 | 0 | 0 | n/a |
