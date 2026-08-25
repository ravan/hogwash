# ADR 0001 — Cross-family jury firewall

Status: superseded by ADR 0010 (2026-08-28).

## Context

LLM evaluators measurably prefer their own generations, even when authorship is hidden (NeurIPS 2024 self-preference studies; PoLL panel-of-judges results — see docs/ideas/slop-cli.md, "A model cannot grade its own prose"). hogwash uses LLMs both to find style problems and to rewrite text, so an unguarded design would let a model grade — and pass — its own prose.

## Decision

1. Judges are extractors, not critics: the cage prompt asks "which rules match, at which quoted spans", never "is this good". Scanner output and other judges' output are hidden; every judge call runs in a fresh session.
2. The document's source model is **declared** by the user, never auto-detected. Default `unknown`.
3. Confidence comes from independence: a finding is `confirmed` only via the deterministic scanner or agreement of ≥2 model families. A finding supported only by the source model's family is tagged `self-report` and is never auto-fixed. With source `unknown`, single-family findings cap at `review`.
4. The fixer defaults to a family different from the source model, and the deterministic scanner — never any model — verifies every fix.

## Consequences

- Adding a jury family is cheap (one adapter behind `AgentAdapter`); removing the firewall is a spec change, not a flag.
- Single-family setups (only Claude configured) can never produce `confirmed` judge findings on Claude-sourced documents; users see `review`/`self-report` instead of false confidence. This is intended.
- Auto-detecting the source model is permanently off the table unless this ADR is superseded; it would reintroduce authorship claims the product forbids (spec §6.2).
