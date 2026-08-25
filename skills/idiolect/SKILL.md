---
name: idiolect
description: Use when the user wants their writing or speaking voice captured as a reusable profile, wants text written or rewritten to sound like them (not like an AI), has no writing samples but wants a voice profile built by guided questions, wants an existing voice profile critiqued or improved, or gives feedback like "sounds fake", "more like me", "I'd never say that".
disable-model-invocation: true
---

# Idiolect

Your idiolect is the language only you speak: your words, rhythm, punctuation,
and habits. This skill captures it as a versioned profile that any writer —
human, skill, or agent — can apply, so generated text reads like the owner
thought it and wrote it. Method and rules are grounded in published research;
the evidence behind every rule is in
[references/foundations.md](references/foundations.md).

## Boundaries that hold in every mode

- This is style adaptation for the owner's own voice (or a house voice they
  are authorized to maintain). No deceptive impersonation of someone else.
- A voice rule never changes substance. Facts, claims, numbers, uncertainty,
  names, quotes, code, and links survive every rewrite exactly.
- Samples come only from locations the owner explicitly names. Never hunt for
  writing on your own — not the repository, not `git log`, not READMEs or
  docs folders, not chat history. Readable is not the same as offered.
- Private samples stay local and are never quoted in generated output.
- Never learn from AI-assisted or unreviewed generated text; it teaches the
  machine's voice back to itself.
- An observed absence is not a ban. Only the owner declares bans.
- Culture and first language inform questions, never conclusions. No trait is
  ever assigned from a name, nationality, or L1.
- Durable profile changes need the owner's approval and a changelog entry.
- Never claim the output is undetectable or "passes as human". The claim is:
  it follows the profile.

## The profile

One directory holds any number of named profiles (default `profiles/`, or
wherever the project's config points), so a project can keep several voices —
a personal voice, a house voice, a docs voice. Each profile is a named
subdirectory:

```
profiles/<name>/
  voice.md          # stable core: portrait, 16 dimensions, mechanics,
                    # function-word fingerprint, lexicon, heritage, moves
  quality.md        # what "good" means per format
  ban-list.md       # owner-declared literal bans (machine-scannable bullets)
  registers/*.md    # per-context overlays: blog, email, chat, whitepaper,
                    # tech-doc, talk... only deltas from the core
  evidence.md       # sample ledger, observations, interview record, calibration
  changelog.md      # dated history of every durable change
```

Never overwrite a non-empty profile with a template. Start new files from
[templates/](templates/voice.md), adapt shape to the project, and respect an
existing project config (e.g. `hogwash.json`) that names profile paths — a
config pointing at flat profile files counts as one existing profile.

Two status ladders, kept distinct: each CLAIM is `reported` (user said it) →
`observed` (seen in samples) → `confirmed` (both, or approved in action); the
PROFILE is `provisional` until at least one register passed the behavioral
check and one real piece went through refinement with the owner's verdicts —
then `calibrated`.

## Onboarding a voice build

Every build starts here, in order. Do not skip ahead to capture.

1. **Find the profiles directory.** The project's config wins; otherwise
   default to `profiles/`. List the profiles already in it.
2. **If any profile exists, ask the owner to choose:** improve an existing
   profile (continue in Critique or Refine on that profile) or create a new
   one beside it. Never choose for them, and never overwrite.
3. **For a new profile, ask for a name.** It becomes `profiles/<name>/`,
   started from the templates.
4. **Ask whether the owner has authentic past writing.** If yes, ask them to
   point at the directory (or specific files) that holds it, and work from
   exactly that material → [references/corpus.md](references/corpus.md).
   If they name nothing, there is no corpus — do not go find one.
5. **Little or no corpus** → run the guided interview: anchored examples the
   owner points at, not questions they can't answer →
   [references/interview.md](references/interview.md). Corpus and interview
   combine well; interview answers fill gaps, corpus verifies answers.

## Modes

Pick by what the user needs; they chain naturally.

### Create

No usable profile yet, or the owner wants a new named voice. Run the
onboarding workflow above, then capture through corpus, interview, or both.
Either way the profile ships `provisional` with every claim tagged reported /
observed / confirmed, and hardens only through use.

### Apply

Write or rewrite something in the owner's voice, or teach another process to.
Follow [references/apply.md](references/apply.md): load core + register
overlay + quality + bans, pick 1–3 matched exemplars, draft meaning-first,
then run the ordered self-check (substance → bans → register → mechanics →
rhythm → attribution test).

### Critique

Judge a profile against the ten-point rubric in
[references/refine.md](references/refine.md): mechanics not vibes,
fingerprint depth, register honesty, rhythm rule, evidence trail, ban
hygiene, caricature risk, heritage handling, aliveness, admitted unknowns.
Report verdicts with the smallest fix each; apply fixes only through the
feedback loop.

### Refine

The owner reacted to a piece or wants the profile to learn. Follow the
feedback loop in [references/refine.md](references/refine.md): capture the
exact signal, diagnose, scope narrowly, propose the diff, get approval, log
it, re-check. A direct instruction ("never say X") is itself approval for
exactly that rule — no extra round-trip, and no widening it. Judge output
with four separate verdicts — substance, sounds-like-me, naturalness, hard
rules — never one blended score.

## Finish visibly

After any profile change, report: files touched, rules added / narrowed /
superseded, evidence recorded, open unknowns, and what calibration ran. A
voice profile is never finished — the changelog is the proof it's alive.
