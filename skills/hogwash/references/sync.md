# Sync the rule sources

Sync only when the user asks for it. Run inside the skill directory:

```sh
cd "$SKILL" && bun scripts/sync/main.ts --all              # every source
cd "$SKILL" && bun scripts/sync/main.ts --source slop-gate # one source
```

Structured sources update their packs deterministically. Prose sources draft advice through a model (`--family claude` by default, `codex` as the alternative) and write `*.proposed.json` proposals beside the packs; pass `--detect-only` to record upstream drift without drafting. The sync never commits. Report which packs changed and which proposals wait for review, and leave the git diff and every proposal decision to the user.
