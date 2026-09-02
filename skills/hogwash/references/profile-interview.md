# When the profiles need work

The profiles are the `idiolect` skill's job. It captures a voice as evidence-backed mechanics: a portrait, sixteen scored dimensions, punctuation and function-word habits, a lexicon, per-format register overlays, an evidence ledger, and a changelog. Only the user runs it (`/idiolect`). When a profile is missing, generic, or inaccurate, say so, name the profile file, and suggest `/idiolect`. Do not run your own interview when that skill is installed; two interviews with two vocabularies produce two profiles that disagree.

## Fallback when idiolect is not installed

Check for `$SKILL/../idiolect/SKILL.md` first. Only when it is absent, gather the minimum yourself, using the idiolect vocabulary so a later `/idiolect` run can take over the files:

- Ask the user for three to five documents they wrote without model assistance, and work only from the files they name. Never go looking for samples in the repository, the git history, or chat.
- Tag every claim you write into `voice.md` as `reported` (the user said it) or `observed` (seen in the named samples). Never write `confirmed`; that needs both.
- Fill the template sections that the evidence settles and leave the rest blank under "Unknowns". Blank beats guessed.
- For `quality.md`, ask which formats matter and propose one checkable rule at a time for each. Do not infer publishing requirements from voice samples alone.
- For `ban-list.md`, record only literal words or phrases the user declares, one bullet per matched form, reason after a spaced hyphen (` - `). An observed absence is never a ban.
- Draft one short paragraph in the captured voice and ask whether it sounds right. Record the answer in the profile's notes.

Mark the profile `provisional` in its status line. It hardens only through the idiolect skill's calibration.
