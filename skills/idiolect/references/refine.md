# Critique and refine: keep the profile true over time

Two jobs: judge an existing profile's quality, and evolve a profile from
feedback on generated pieces. Evidence base in [foundations](foundations.md),
sections 3, 5, and 7.

## Critique a profile

Score each area pass / weak / fail, with the line cited:

1. **Mechanics, not vibes.** "Warm and conversational" is a horoscope. Rules
   must be checkable: "at most one comma per sentence" passes; "punchy"
   fails. Count the rules a reviewer could verify mechanically.
2. **Fingerprint depth.** Does it capture function words, punctuation
   habits, sentence-length spread, grammar habits — or only word choices?
   Vocabulary-only profiles keep the model's grammatical accent.
3. **Register honesty.** Are format differences separated into overlays, or
   is one blended average pretending to be a person? A profile claiming one
   style for blog and chat is describing nobody.
4. **Rhythm rule present.** No statement about sentence-length variation
   means the strongest machine tell is unguarded.
5. **Evidence trail.** Does each strong claim cite samples, an interview
   answer, or an approval? Distinguish reported / observed / confirmed?
   Untraceable rules are unfalsifiable.
6. **Ban hygiene.** Every ban user-declared, with reason and replacement?
   Bans inferred from absence are defects — a small corpus proves nothing
   about what a person never says.
7. **Caricature risk.** Signature phrases marked as options, not quotas?
   Would applying every rule at once produce a parody? (Test mentally on a
   boring paragraph.)
8. **Culture and heritage.** Dialect and idiom preserved with the owner's
   consent? Any trait justified by nationality instead of evidence is a
   defect (ecological fallacy — foundations, section 4).
9. **Aliveness.** Changelog and calibration entries exist and are recent? A
   profile without a feedback trail is a snapshot decaying quietly.
10. **Unknowns admitted.** Blank beats guessed. A profile with no unknowns
    was written by wishful thinking.

Report per-area verdicts with the smallest useful fix for each, then offer to
apply fixes through the feedback loop below — not by silent rewrite.

## Judge a generated piece

When the owner reviews a piece written with the profile, ask four separate
verdicts — one blended "8/10" hides the failure mode:

1. **Substance:** is the content right — facts, claims, uncertainty?
2. **Sounds-like-me:** could you have written this? Which exact lines no?
3. **Natural:** any forced phrases, any caricature, any machine smell?
4. **Hard rules:** any ban or non-negotiable violated?

Always chase the pointing finger: "which exact phrase?" beats any score.
An owner edit of the draft is the best feedback there is.

For a material profile change, prefer a blind pair: same brief, candidate A
on the old profile, candidate B on the new, unlabeled. The owner's pick plus
their reason is the calibration evidence. Record every run in `evidence.md`.

## The feedback loop

Feedback is proposed evidence, never permission for silent mutation.

1. **Capture the signal exactly.** A direct instruction ("never say
   'leverage'"), a correction ("I'd have written X"), a chosen candidate
   plus reason, an approved final, a new authentic sample. NOT valid
   signals: an unreviewed model draft, your own critique of your own
   output, silence.
2. **Diagnose before encoding.** One edit may be about facts, mood, or that
   day's audience. Was it style at all? Which register? Would the fix have
   improved yesterday's piece too?
3. **Scope it.** Global, one register, one topic, or a one-off. Default to
   the narrowest reading; promote to core only when the pattern shows up in
   a second context or the owner says "always".
4. **Propose the diff.** Show: the rule to add / narrow / widen / supersede /
   remove, the signal behind it, the scope, and any existing rule it
   conflicts with. The owner approves the durable rule, not just the draft
   that prompted it. A direct instruction ("never use X") is approval for
   exactly that rule: a ban declared with "never" is global unless the owner
   scopes it, it covers only the named term (synonyms need their own
   approval), and when no replacement was given, ask for one rather than
   inventing it.
5. **Write it down.** Apply the diff, add the changelog entry, mark any
   superseded rule as superseded (don't erase it — future contradictions
   need the history). Owner reactions to a generated piece land in
   `evidence.md`'s calibration table; a line the owner endorsed also goes in
   the observations table as an exemplar, marked option-not-quota.
6. **Re-check after material changes.** One short piece in the most-used
   register with the updated profile. A rule that improves email but breaks
   blog gets narrowed to email. Repeated corrections raise confidence;
   repetition alone never turns a preference into a ban.

### "More of this" / "less of that"

The commonest signal and the easiest to over-apply. "More dry humor" means
raise the Gravity position a notch and note where humor landed well — not
insert a joke per paragraph. "Less hedging" moves Certainty, and usually
only in the register that prompted it. Translate every like/dislike into a
dimension move, a mechanics rule, or a lexicon entry; if it maps to none of
those, ask one clarifying question instead of guessing.

## Drift guards

- Never learn from AI-assisted text the owner hasn't claimed line by line.
- Never promote an observed absence to a ban.
- Never let the profile grow monotonically: each addition states what it
  supersedes or narrows, or why it's genuinely new. A profile that only
  accretes becomes self-contradictory slop.
- Aspirational rules ("I want to sound more direct") are legitimate but
  marked `desired`, so a later critique doesn't "correct" them back to
  observed habits.
- The owner can always say "freeze the profile" — then generation continues
  but learning stops until unfrozen.
