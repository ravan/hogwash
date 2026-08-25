# ADR 0006 — The default threshold drops to 25

Status: accepted (2026-08-27). Supersedes ADR 0003.

## Context

ADR 0003 confirmed 40 when the corpus band was [11.3 highest control, 83.5
lowest positive] — three planner-authored positives, all dense. The corpus grown
in ADR 0005 added real ChatGPT essays (ghostbuster-data) and real human
controls, and the band moved: highest control 11.4
(`human-marketing/celsius-press-release.md`), lowest shipped positive 46.8.

Sampling 8 ghostbuster ChatGPT essays showed the real problem: 5 scored under
40 (as low as 8.8). At 40 the scanner missed most ordinary GPT-3.5 essay prose.
The misses are not a rule gap alone: those essays do fire rules, but the
biggest hits are advisory vocabulary rules that count zero by design, and the
counting rules land the documents in the 9–20 band.

## Decision

`DEFAULT_THRESHOLD` drops from 40 to 25.

- 25 keeps a 2.2× margin over the highest measured control (11.4), so the §6.9
  invariant — every human class passes — holds with room.
- 25 roughly matches the geometric midpoint of the measured band (23.1).
- Of the 8 sampled ChatGPT essays, 25 catches about 6 rather than 3.

Alongside, `loose.wiki-ai-words` was narrowed (wikipedia-signs 0.4.0):
'significant', 'highlight', 'enhance', 'rich' and 'key <noun>' were dropped
after scoring 0.56 precision — they fired on the human marketing and mail
controls as often as on machine prose. The rule is advisory, so this changes
reviewer noise, not density.

The fix-pipeline tests in `src/cli.test.ts` pin `--threshold 40` for the
`fix-dirty.md` scenarios: that fixture is 73 words, so its one intentionally
unfixable finding alone produces density 34. Those tests exercise the fix
pipeline, not the shipped calibration.

## Consequences

- Essays in the 25–40 density band now fail scan, as they should.
- Essays under 25 still pass; the residual gap (2 of 8 sampled) needs either
  era-tagged counting rules for mild GPT prose or a stylometric signal, not a
  lower threshold — under ~20 the control margin thins to noise.
- A real-world document that used to pass between 25 and 40 will now fail.
  That is the point, but users can raise `threshold` in `hogwash.json`.
