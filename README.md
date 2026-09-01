<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/logo/hogwash-lockup-dark.svg">
  <img alt="hogwash" src="docs/logo/hogwash-lockup.svg" width="320">
</picture>

Two skills that help a coding agent write documents in your voice, without machine-writing artifacts.

| Skill | What it does |
| --- | --- |
| [`hogwash`](skills/hogwash) | Scans Markdown and plain text for machine-writing artifacts, then drives a candidate rewrite loop that you review and accept. |
| [`idiolect`](skills/idiolect) | Captures a person's written and spoken voice as a research-grounded profile, then applies it and updates it from your feedback. |

The skills work together. `/idiolect` builds the voice, quality, and ban-list profiles; hogwash holds every rewrite to them. You can also use either skill alone.

Each skill is self-contained. Its scripts, rules, templates, dependencies, and tests live inside its own directory, so you can copy that one directory and it works.

## Install

The hogwash scripts require Bun 1.4 or later.

The quickest path is the [skills CLI](https://github.com/vercel-labs/skills), which copies both skills into the right place for your agent:

```sh
npx skills add ravan/hogwash    # or: bunx skills add ravan/hogwash
```

Add `-g` to install for every project instead of just the current one, or pass `--skill hogwash` / `--skill idiolect` to take one skill without the prompt.

If you cloned this repository instead, copy or symlink each skill directory into wherever your agent looks for skills:

```sh
ln -s "$PWD/skills/hogwash" ~/.claude/skills/hogwash
ln -s "$PWD/skills/idiolect" ~/.claude/skills/idiolect
```

There is no setup step. On first use the skill installs its own script dependencies and scaffolds `hogwash.json` and the `profile/` templates. Start it with one sentence to your agent:

> Initialize hogwash in this project.

## Hogwash

Hogwash reports patterns, rates, and counts. It does not decide who wrote the text.

The skill drives the scripts; you drive the skill. Ask your agent to run hogwash on one document and the loop follows:

1. The agent maps the document's format to one of the three scanner registers — `technical` (architecture docs, ADRs, READMEs, specs), `prose` (blog posts, essays, articles, emails), or `marketing` (landing pages, product copy, press releases) — and passes `--register` when it differs from the `hogwash.json` default. Every scan of the document uses that same register.
2. The agent scans the original and freezes that report as a baseline checklist.
3. It copies the original to a sibling candidate: `docs/post.md` becomes `docs/post-hogwash.md`, `README` becomes `README-hogwash`. The original stays unchanged.
4. It rewrites the candidate against your profiles, rescans, and repeats until no actionable finding remains. Later rescans measure the candidate but never replace the baseline checklist.
5. You review the diff and give an explicit verdict.
6. Only after your approval does `accept` atomically rename the candidate over the original.

A finding is `actionable` when the loop must resolve it before acceptance. Advisory findings stay visible but never block. When a finding can only be resolved by changing one of your claims, the agent asks instead of deciding; you can waive the finding and keep the claim.

### Scrub by default, re-voice on request

The rewrite loop has two modes, and what you say decides which one runs.

Ask for hogwash on a file with nothing more — "run hogwash on `docs/post.md`" — and you get **scrub mode**: the smallest faithful edits that clear the findings and profile violations. A sentence with no finding and no violation stays exactly as you wrote it, because uniform polish is itself a machine signal. Scrub assumes the document is already in your voice and only removes the artifacts.

Say **"re-voice this"** or **"rewrite it in my voice"** and you get **re-voice mode**: a voice transfer for a document someone else wrote. The candidate is rebuilt paragraph by paragraph in the profile owner's voice — rhythm, emphasis habits, punctuation mechanics, and all — with the source author's delivery devices replaced by the owner's. The loop alternates machine-smell passes and voice passes until a full cycle changes nothing, because each kind of fix can reintroduce the other kind of problem. Keeping a sentence is a per-sentence decision in this mode, never a default. The agent only enters re-voice on that explicit direction; it never upgrades a scrub to a voice transfer on its own.

Both modes hold the same source-fidelity boundary: every fact, claim, number, name, scope, and quotation keeps its exact meaning, and headings, citations, code, and table data stay untouched. Re-voice changes how the document sounds, never what it says. And both modes end the same way: you review the candidate and give an explicit verdict before `accept` touches the original.

### Short mode: one pass for short messages

Documents get the loop; messages get one pass. Short mode cleans a single short text — an email, a chat reply, a PR or commit comment — without any of the document machinery: no candidate file, no baseline checklist, no pass counter, no review gate. It is also the surface other skills call when they need a message cleaned before it goes out.

The contract is four steps: write the draft to a scratch file, scan it with `--short`, rewrite it once, and rescan once. The single rewrite does both jobs: it fixes every actionable finding and applies your voice profile, the register overlay that matches the format, and your ban list — so the message comes back in your voice with the machine smell gone, and still says what you meant. The result comes back with a one-line status — clean, or what stands and why. The `--short` flag turns off the rules whose statistics need a long document, so a three-sentence reply is not judged against essay-length baselines. You keep ownership of the draft and the decision to send it.

### Run the scripts by hand

The same scripts work without an agent. `$SKILL` is the skill directory; run each command from your project directory:

```sh
SKILL=~/.claude/skills/hogwash
bun "$SKILL/scripts/hogwash.ts" init                       # scaffold hogwash.json and profile/
bun "$SKILL/scripts/hogwash.ts" scan --register prose docs/post.md  # scan; also --output json|sarif
bun "$SKILL/scripts/hogwash.ts" scan --short --output json note.md  # short-message scan, long-document rules off
bun "$SKILL/scripts/hogwash.ts" report --md                # render the stored report
bun "$SKILL/scripts/hogwash.ts" rules --explain <rule-id>  # list or explain scanner rules
bun "$SKILL/scripts/hogwash.ts" diff docs/post.md          # open original vs candidate in your viewer
bun "$SKILL/scripts/hogwash.ts" accept --approved docs/post.md
bun "$SKILL/scripts/hogwash.ts" hook --install             # pre-commit scan hook
```

`init` never overwrites a profile that already exists. `scan` is the only command that scans; no command other than the agent-owned loop rewrites a document. `scan` writes `.hogwash/report.json` (report v6) and every finding carries raw UTF-16 offsets, a 1-based line and column range with an exclusive end, and an `actionable` boolean.

The scan exit code is density-based, where density is the weighted actionable findings per 1,000 prose words:

- `0`: every file is at or below the threshold.
- `1`: at least one file exceeds the threshold.
- `2`: usage, configuration, adapter, or I/O failure.

`scan --fail-on <info|warning|error>` adds a second way to fail: any finding at
or above that severity exits `1`, whatever the density says. Density asks
whether a document as a whole reads as machine writing. A house rule, your own
punctuation or your own length limits, is the sort of rule one breach of already
fails, and a long enough document dilutes any single breach below the threshold.
Use the gate when a rule has to hold every time.

### Configure

Hogwash reads `hogwash.json` from the working directory. The file is optional: when it is absent, the built-in defaults apply (advanced consultation stays off; both advisers default to Claude once a project enables it), profile paths resolve through `~/.idiolect/` after the project, and a missing ban list is tolerated for scanning. Write the file only when the project needs fine-tuning. Unknown and retired keys are errors, and paths resolve from the working directory, then from `~/.idiolect/`. [hogwash.example.json](hogwash.example.json) shows the complete defaults. The main settings:

- `register`: the project's default writing context, which selects stylometric baselines and rule weights: `technical`, `prose`, or `marketing`. `scan --register <name>` overrides it per document.
- `threshold`: the density above which `scan` exits `1`.
- `packs` and `gates`: which rule packs run, plus explicitly enabled model-specific rule groups. Hogwash never infers a gate from document authorship. One pack ships off by default: `mechanics` holds punctuation and length rules (connector dashes, more than one comma in a sentence, paragraphs past three sentences) that are a writer's house preference rather than a machine-writing tell, so a project turns it on by naming it here. Its two counting rules take their ceiling from a `limit` field in the pack, so a fork can set its own numbers without touching code.
- `profile`: paths to your voice, quality, and ban-list files.
- `workflow.diff`: the viewer `diff` launches (`code --diff` by default; set it to `null` to disable it).
- `workflow.advanced` and `models`: opt-in model consultation. With `advanced.enabled`, `consult` reads the candidate plus all three profiles, makes exactly one configured model call (Claude or Codex), and returns advice as JSON. The consultant never scans, edits files, or owns the loop, and an unavailable family fails instead of falling back to another model.

## Idiolect

Your idiolect is the language only you speak: your words, rhythm, punctuation, and habits. The skill captures it as a versioned profile that any writer can apply: a human, a skill, or an agent. Every rule in the method is grounded in published research; the evidence lives in [references/foundations.md](skills/idiolect/references/foundations.md).

Only you can invoke it (`/idiolect` in Claude Code); no model or skill triggers it on its own. It runs in four modes that chain naturally:

- `Create` builds a named profile under `profiles/<name>/` from writing samples you point at, a guided interview, or both. The profile holds a stable core (`voice.md`), per-format quality bars, an owner-declared ban list, per-context register overlays, an evidence ledger, and a changelog.
- `Apply` writes or rewrites a piece in the owner's voice, meaning-first, with an ordered self-check.
- `Critique` judges a profile against a ten-point rubric and reports the smallest fix for each miss.
- `Refine` turns feedback like "I'd never say that" into a narrow, approved, logged profile change.

The skill holds hard boundaries: samples come only from locations you explicitly name, voice rules never change facts or claims, durable profile changes need your approval, and it never claims the output "passes as human". The claim is that it follows the profile.

## Keep the rules fresh

The scanner rules live in [skills/hogwash/rules](skills/hogwash/rules) as versioned packs, each with one license and one upstream lineage. `sync` pulls the upstream sources and updates the packs:

```sh
bun run sync --all                 # from the repo root
bun run sync --source slop-gate    # one source
```

If you only have the installed skill directory, run the same script from inside it:

```sh
cd ~/.claude/skills/hogwash && bun scripts/sync/main.ts --all
```

The sources are `wikipedia-signs`, `claudisms-ai`, `excess-vocab-csv`, `vale-ai-tells`, `slop-gate`, `blader-humanizer`, and `pstack-unslop`. Structured sources convert through deterministic mappers with no model call. Prose sources may draft advice for human review through a model (`--family claude` by default, `codex` as the alternative); pass `--detect-only` to record what changed upstream without drafting. Each source keeps a snapshot of its last fetch, so a run only proposes what changed upstream, and proposals land beside the packs as `*.proposed.json` for review.

There is no scheduled sync; you decide when the rules refresh. With the skill installed, one sentence to your agent does it:

> Sync the hogwash rule sources and tell me what changed.

The sync never commits. Review the git diff and any `*.proposed.json` proposals, and commit what you keep.

`bun run eval` measures deterministic scanner quality against the tracked corpus and writes [docs/evaluation.md](docs/evaluation.md). `bun run eval --gate` fails when a corpus class is empty, a control exceeds the threshold, or a positive does not exceed it.

## Development

```sh
bun install
bun run check          # lint, typecheck, and the test suite
bun run eval --gate
```

All tests live under [tests/](tests), outside the shipped skill folders, so installing a skill never pulls in test code or test data. `bun test` from the root runs everything; `bun test tests/hogwash` runs one skill's suite.

`bun run sync`, `bun run import-liang`, and `bun run eval` are thin wrappers in [tools/](tools). Each one runs the matching script inside `skills/hogwash`.
