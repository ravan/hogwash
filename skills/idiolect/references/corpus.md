# Corpus capture: build a profile from real writing

Use when the user has authentic past writing. Observed text outranks anything
the user says about themselves (foundations, sections 1 and 3), so even a
small corpus is worth mining. Combine freely with the
[interview](interview.md): interview answers fill gaps the corpus cannot
settle, and the corpus verifies or overrides interview answers.

## 1. Gather and authenticate

- The owner points at the samples; you never go looking. Work only from the
  directory or files the owner explicitly names. Never harvest samples from
  the project repository, `git log`, READMEs, docs, or chat history uninvited
  — readable is not the same as offered. If the owner names nothing, there is
  no corpus: switch to the [interview](interview.md).
- Ask before touching private material (sent mail, chat exports, unpublished
  drafts). Keep it local; never quote private samples in generated output.
- Developers have more corpus than they think. If the owner is unsure they
  have anything, suggest what usually exists: sent emails, Slack/Teams
  history, README files, commit messages, code review comments, design docs,
  issue writeups. The owner gathers it or names where it lives. Commit
  messages are a real register.
- For spoken voice: talk recordings or meeting transcripts work. Note
  transcription artifacts (fillers, punctuation guessed by the transcriber) so
  they don't become "rules".
- Mark every sample's authorship: `human`, `edited` (by another human),
  `AI-assisted`, `unknown`. Only `human` samples are primary evidence.
  AI-assisted and unknown samples are quarantined — co-writing with a model
  measurably drags an author's wording toward the model's defaults
  (foundations, section 5), so learning from them teaches the machine's voice
  back to itself. They count only for passages the user confirms as genuinely
  theirs.
- Mark whether the user still endorses each piece. Old writing they've grown
  out of is history, not target.

## 2. Cover, then hold out

- Aim for 5–10 pieces across at least two registers and several topics. Topic
  masquerades as style; sampling one topic bakes its vocabulary into the
  profile as if it were voice.
- Prefer natural writing (sent mail, chat) over polished publication copy —
  edited prose contains the editor.
- Beware prompt contamination: people unconsciously mirror the style of text
  they are replying to (language style matching, Ireland & Pennebaker 2010).
  A reply to a formal email is evidence about the sender's formal register,
  not their baseline.
- Reserve roughly one fifth of usable samples — at least one whole piece — as
  a holdout, marked `HOLDOUT` in `evidence.md`. Rules are built without it and
  tested against it.

## 3. Extract the fingerprint

Work through this checklist per register, then compare across registers.
Count; don't vibe. Every observation lands in `evidence.md` with sample IDs,
and only patterns with at least two occurrences and noted counterevidence
become profile rules.

- **Function words:** pronoun rates (I/we/you/one), articles, connectives
  actually used ("so", "but" sentence-initial, "which means") and never used
  ("moreover", "thus", "furthermore"). The most stable authorship layer.
- **Sentence lengths:** shortest, longest, and the SPREAD — does the writer
  mix 4-word and 40-word sentences, or hover near the mean? Record the spread
  itself; matching only the average manufactures the machine tell.
- **Punctuation:** em-dash, semicolon, colon, parentheses, ellipsis,
  exclamation and question marks — per-1000-words habits. Among the strongest
  individual signals.
- **Grammar habits:** fragments, passive rate, nominalizations ("the
  implementation of" vs "implementing"), participial openers, question use.
- **Openings and endings:** first sentence of each piece and paragraph;
  greeting and sign-off habits; how pieces stop (summary? callback? next
  action? just stops?).
- **Discourse:** where the main claim sits (first line? after a scene?), how
  transitions happen (explicit connectives vs hard cuts), example density.
- **Lexicon:** recurring words and constructions (candidate "words I reach
  for"), intensifiers and hedges, technical-vs-plain word choices, dialect
  forms and idioms (heritage — preserve, don't normalize).
- **Emphasis and typography:** bold/italics/CAPS, list habits, heading style,
  emoji inventory, lowercase-in-chat.
- **Humor and imagery:** what kind, how often, from which source domains.
- **Spoken samples only:** discourse markers ("look", "right", "so"),
  repetition-for-emphasis, aside habits — the involvement features that mark
  the oral end of the gradient.

Then score dimensions 1–16 of `voice.md` from the evidence, tagged `observed`
with evidence IDs. Traits seen in two or more registers go in the core; the
rest go in register overlays.

## 4. Reconcile with what the user said

Where corpus and interview disagree, neither silently wins. Show the user the
conflict with the evidence:

> "You rated yourself 2 (asserts) on certainty, but in 7 of 9 emails you
> hedge conclusions ('I think', 'probably'). Keep the hedges (that's your
> real voice) or is the profile aspirational here?"

Both answers are legitimate. Desired voice may differ from observed habits —
record which one the profile encodes, and where. Tag agreement of report and
observation as `confirmed`.

## 5. Test on the holdout

Draft one short piece in a covered register with the new profile, on a topic
from the holdout piece. Compare against the holdout like an authorship
analyst: same function-word habits? Same punctuation rates? Same
sentence-length spread? Same opening move? Then show both to the user with
the [refinement rubric](refine.md). Record the run in `evidence.md`
(calibration table). The profile stays `provisional` until a holdout or live
piece passes with the user's verdicts recorded.
