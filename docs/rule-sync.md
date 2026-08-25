# Rule sync

How the shipped rule packs track their upstreams. The user-facing summary
lives in the README; this file is the full reference.


`bun run sync` fetches an upstream banlist, normalizes it to a plain-text
snapshot, and compares that snapshot against the vendored one. When lines
changed, it turns them into rule edits, checks each edit against the current
packs, and writes the result down.

A source is one of two kinds, and the kind decides what turns lines into edits.
A **prose source** is a document written for people, so an agent drafts the
edits from the changed lines; that needs a working `claude` or `codex` login,
and `--family` picks which. A **structured source** carries rule data rather
than prose, so a deterministic mapper converts it with no agent anywhere. A
structured sync needs no login at all, and `--family` does not apply to one — it
is ignored, with a line on stderr saying so. Identical upstream bytes always
produce identical working-tree edits.

Seven sources ship. Pick one with `--source`; the default is `wikipedia-signs`.
`--all` runs every source in registry order instead, prints one outcome line
each, carries on past a source that failed, and exits 2 when any source failed or
was refused. `--all` and `--source` cannot be given together.

Every run prints one line per source, in one frozen format:

```
excess-vocab-csv: updated (r1287320886) +12 rules, 3 duplicates, 4 dropped, 8 rejected in all; pack 1 deprecated, 0 re-timed
```

`--detect-only` applies to prose sources only, exactly as `--family` does; a
structured source always writes. A prose source under `--detect-only` fetches,
scans and diffs, then reports the drift and writes nothing. It writes nothing
because writing the snapshot without drafting would eat the diff that a later
local drafting run needs.

`--pr-body <path>` writes the pull-request markdown for the scheduled job to that
path.

| `--source` | upstream | feeds pack | revision from |
| --- | --- | --- | --- |
| `wikipedia-signs` | Wikipedia, "Signs of AI writing" | `wikipedia-signs` | the page's revision id |
| `claudisms-ai` | `https://claudisms.ai/claudisms.md` | `claudisms` | a hash of the content |
| `excess-vocab-csv` | berenslab/llm-excess-vocab, two CSVs | `excess-vocab` | a hash of the content |
| `vale-ai-tells` | tbhb/vale-ai-tells, the ai-tells Vale style | `vale-ai-tells` | a hash of the content |
| `slop-gate` | hwajongpark/slop-gate, the English rule files | `slop-gate` | a hash of the content |
| `blader-humanizer` | blader/humanizer, the SKILL.md pattern list | `humanizer` | a hash of the content |
| `pstack-unslop` | cursor/plugins, the pstack unslop skill | `unslop` | a hash of the content |

A word that an enabled pack already matches is skipped as a duplicate and
counted in the proposal, whichever source proposed it.

claudisms.ai serves a plain document with no revision number, so the content
hash stands in for one. It is deterministic, and blank-line churn does not move
it.

`excess-vocab` measures how much more often a word appears in 2024 academic
abstracts than in 2022. A word becomes a rule only above a frozen excess-ratio
floor — the flood gate — and its weight is derived from that ratio rather than
assigned by hand. The proposal file counts both what the gate dropped and the
candidates an already-enabled pack matched anyway. The pack carries two
lineages: the excess-vocabulary CSVs and the ranked
adjective and adverb tables. Those tables are a hand transcription in
`data/liang-2024-tables.tsv`, imported once by `bun run import-liang` rather
than kept in step with a sync source. The transcription holds the top 100
adjectives and the top 100 adverbs, but only the top ten of each table pass the
rank ceiling: ten is the highest ceiling under which every human fixture still
reports nothing.

`vale-ai-tells` reads a directory listing first and then one file per style, so
it picks up styles the upstream adds without a code change here. Only `existence`
styles contribute, and only their literal phrases of two words or more; a regex
token, a single word, and every other Vale rule type are counted in the proposal
rather than imported. Vale's `scope` and `exceptions` have no hogwash
equivalent, so a style declaring either is counted rather than half-honored.
A phrase an enabled pack already matches anywhere inside it is skipped as a
duplicate, which is why the counted duplicates run into the hundreds.

`slop-gate` states its rules in a format that is nearly hogwash's own, so the
upstream pattern is carried across verbatim and the upstream's hint becomes the
rule's message. A hogwash rule also needs a matching example, which the upstream
does not carry, so the importer derives one from the pattern itself; a pattern
using syntax outside the supported subset yields no example and is counted in the
proposal rather than imported. When the hint offers a quoted phrase, that phrase
also becomes the rule's suggestion in scan reports. The suggestion applies to
the exact derived form alone, so an inflected match still needs a manual
rewrite. The upstream's own `flags` field is not read, because every
lexical rule matches case-insensitively anyway. The upstream also ships five
multilingual rule files; hogwash is English-only, so those are not fetched.

`blader-humanizer` and `pstack-unslop` are prose sources: each fetches one
SKILL.md written for people, so changed lines go to the agent drafter.
blader/humanizer is the upstream the earlier humanizer compilations derived
from, so the pack now tracks the original. The unslop skill's
abstract-metaphor-noun jargon list seeded the `unslop` pack; the rest of the
skill overlaps patterns other packs already carry, so future syncs only draft
what is genuinely new.

A drafted rule is refused when its pattern or examples fail deterministic
schema and example checks. The refusal is counted in the proposal
file like any other, so the reviewer sees what was dropped and why.

The run is manual and never part of a build. It writes three working-tree files
per source:

- `skills/hogwash/rules/<pack>.json` — the accepted edits, applied to the pack.
- `skills/hogwash/rules/<source>.snapshot.txt` — the new snapshot.
- `skills/hogwash/rules/<source>.proposed.json` — the audit trail: every accepted and rejected
  edit, with the reason for each rejection.

Every written pack is validated by the same schema loader the scanner uses, so a
pack that would not load is never written. All three files are tracked, so
`git diff` is the whole output. The sync never commits, pushes or tags — a human
reads the one git diff and commits it, and that read is the gate. See
`docs/adr/0002-sync-writes-pack-edits.md`.

## On-demand sync

There is no scheduled sync and no CI job. A human, or the hogwash skill on a
user's request, runs the registry by hand — `--all` or `--source <name>` — and
reviews the resulting git diff. Add `--detect-only` when no agent credential is
configured, so the prose sources report drift rather than writing a snapshot
nobody drafted from.

## Every upstream is untrusted

An upstream page is text other people control, and the sync feeds changed lines
to an agent. So every body a source fetches is scanned for prompt injection —
every one, not only the first — **before anything
ingests it**: before it is parsed, before it is normalized, before a line
reaches the drafter. The scan runs on the raw bytes, because normalizing strips
HTML comments, and a comment is exactly where an instruction aimed at the agent
would sit unseen by someone reading the rendered page.

Findings come in two grades.

| grade | what it covers | what happens |
| --- | --- | --- |
| `block` | bidi overrides, `<script>`/`<iframe>`/event handlers, `javascript:` and `data:text/html` URIs, an instruction or shell command inside an HTML comment | the sync stops; no snapshot, no proposal, the agent never runs, exit code 2 |
| `warn` | instruction phrases and shell commands in visible prose, zero-width and invisible characters | printed, then the sync continues |

The split is the whole design. A banlist quotes the phrases it bans, so
"ignore all previous instructions" appears on the Wikipedia page as a specimen,
not as a directive — and the page also quotes zero-width characters, and writes
headings like `🧑‍💻` whose emoji contains a zero-width joiner. Blocking on those
would wedge the wiki sync permanently. What blocks is what changes meaning or
executes on its own, and what a prose banlist has no honest reason to contain.

Today both shipped sources scan clean: Wikipedia raises 4 warnings and 0 blocks,
claudisms.ai raises none.

The scan is defence in depth, not the only defence. Nothing the agent returns is
applied either: every draft is checked against the schema, tested against its own
examples, and written to a proposal file for a human to read. A rule reaches a
pack only when someone copies it there.
