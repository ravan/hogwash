# Re-voice a document

Re-voice mode is a voice transfer: the document was written by someone else, and the user directs you to rewrite it in the profile owner's voice. It runs only on that explicit direction ("re-voice this", "rewrite it in my voice"). Never enter it on your own judgment, and never treat a scrub request as a re-voice request. Everything in "Rewrite one document" in `SKILL.md` applies except where this reference overrides it.

The failure mode this reference exists to prevent: treating a re-voice as a scrub, trimming commas and lone words, and shipping the other author's voice under the owner's name. If your diff is mostly single-word swaps and punctuation, you are in that failure mode.

## What changes in re-voice mode

These scrub rules are suspended:

- "Leave a sentence with no finding and no violation exactly as it is." In re-voice, every sentence is either rebuilt in the owner's voice or kept deliberately because it already reads as the owner. Keeping is a per-sentence decision, never a default.
- "Prefer the smallest local edit." The unit of work is the paragraph, rewritten fresh from its propositions.
- "Keep the original's paragraph boundaries and sentence-length spread." The target rhythm, paragraph shape and emphasis habits are the owner's (voice.md and the register overlay), not the source author's. One-sentence drum-roll paragraphs, staccato fragment chains and typographic emphasis (bold, italics) are delivery devices; rebuild them to the owner's habits. The claim keeps its full strength; it loses the other author's delivery.
- "Keep the colons the author wrote." In re-voice, "the author" means the profile owner. A source-author colon that pauses mid-sentence for elaboration is an em-dash substitute: rewrite it as the ban list directs. Keep only colons the owner's mechanics allow (a true list, a setup the owner would write).

## What never changes, in any mode

Every proposition boundary (fact, claim, number, name, actor, scope, modality, polarity, quantifier, certainty), direct quotations, citations, code, table data, headings and section order. Add nothing, drop nothing. When a voice rule needs information the source does not contain, leave it unmet and raise it at the review gate.

## The layered loop

Alternate machine-smell passes and voice passes until both come back empty:

1. Scan the original with `--baseline`, create the candidate (as in the document workflow).
2. Smell pass: resolve every actionable finding in the candidate.
3. Voice pass: rewrite the candidate paragraph by paragraph. For each paragraph: list its propositions from the source; write the paragraph fresh in the owner's voice (dimensions, mechanics, function words, signature moves, register overlay); check every ban; verify each proposition survived with identical boundaries.
4. Rescan with the same register. A voice pass can introduce machine smells, and a smell fix can flatten the voice, so the layers repeat.
5. Repeat from step 2 until one full cycle produces zero actionable findings AND a voice pass with zero edits. A cycle that changed anything does not count as converged; run another.
6. Judge the textual diff against the original under the proposition-boundary rules, then hand off at the review gate as usual.

Each cycle (steps 2 to 4) consumes one autonomous pass from `workflow.maxPasses`. The default budget of five is tight for a long document in this mode: when a document has more than about ten paragraphs, tell the user before the first cycle that the budget may run out and offer to raise `workflow.maxPasses` for this project. On the plan surface, name the entries "Cycle N: smells" and "Cycle N: voice".

## Rationalizations, all observed in a real failed session

| Excuse | Reality |
| --- | --- |
| "This sentence has no finding, so it stays" | That is scrub mode. In re-voice, an untouched sentence is a decision to keep the other author's sentence. Make it deliberately, sentence by sentence. |
| "Bold is emphasis and emphasis is content" | The claim's strength is content. The delivery device is voice. Restate the claim at full strength in the owner's idiom. |
| "The author wrote that colon, so it stays" | The source author is not the owner. The owner's mechanics decide every construction. |
| "A full rewrite risks semantic drift, so I trim words" | Word-trimming is the failure mode: it ships the other author's voice under the owner's name. Drift is controlled by the per-paragraph proposition check, not by refusing to rewrite. |

## Red flags

Stop and restart the voice pass when: the diff is mostly commas and single words; no paragraph was rebuilt; the other author's one-liner beats, bold pattern or counting openers survive; you just quoted a scrub rule to justify keeping a sentence.
