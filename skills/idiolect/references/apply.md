# Apply a voice: write so the owner could have written it

For any skill, agent, or process that generates or rewrites prose using an
Idiolect profile. The research behind each step is in
[foundations](foundations.md), sections 5–6.

## Load in this order

1. `voice.md` — the core. Always.
2. `registers/<register>.md` — the overlay matching the piece's format.
   Overlay wins where they differ. No overlay for this format? Use the core,
   say so, and note which register overlay would help.
3. `quality.md` — the bar for this format.
4. `ban-list.md` — hard constraints on authored prose.
5. One to three exemplars, if the profile links samples or before/after
   pairs: pick by SAME register and similar task — a matched email beats
   three brilliant blog posts. Never load the whole archive.

## Draft

- Meaning first: get the content right in plain form, then push it through
  the voice. Voice rules never authorize changing facts, claims, numbers,
  uncertainty, names, quotes, code, or links. In a rewrite, the original is
  the sole authority on substance.
- Frame from the exemplars as continuation, not imitation: write as the next
  thing this person wrote, in the shown register. Completion framing
  measurably beats "please imitate" instructions.
- Apply the dimensions as positions, not as decoration. A 2 on Certainty
  means conclusions get stated flat; it does not mean inserting "obviously"
  everywhere.
- Favorite phrases are options, never quotas. A signature phrase forced into
  every piece is the caricature failure — one appearance where it genuinely
  fits beats three insertions.
- Expect informal registers (chat, personal blog) to be the hard case;
  budget an extra pass there.

## Self-check before showing anyone

In order; earlier gates outrank later ones:

1. **Substance:** same facts, claims, numbers, uncertainty, intent. Nothing
   added, dropped, strengthened, or weakened.
2. **Bans:** zero ban-list hits in authored prose. Quotes, code, commands,
   error strings, proper names are exempt — report a conflict instead of
   corrupting them.
3. **Register fit:** shape, length, opening, ending match the overlay.
4. **Core mechanics:** punctuation habits, contractions policy,
   function-word habits, paragraph shape.
5. **Rhythm:** read the sentence lengths. If they hover around one mean,
   break the pattern the way the owner does — that uniformity is the
   strongest machine tell. Also strip machine vocabulary and adjective
   inflation ("delve", "showcase", "commendable", "meticulous") unless the
   owner demonstrably uses them.
6. **The attribution test:** would someone who knows the owner's writing
   attribute this to them? If it merely "sounds nice", it fails — nice is
   the model's voice.

## Hand off honestly

- Deliver the piece; keep the analysis unless asked.
- Never claim it "passes as human" or is undetectable — that is not the
  goal, and detectors are unreliable in both directions. The claim to make:
  it follows the profile, and here is where it strains against it.
- If the piece surfaced a gap (no overlay for this register, a dimension
  with no position, a conflict between rules), report it as a candidate for
  [refinement](refine.md). Do not silently edit the profile.
