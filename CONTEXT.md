# Hogwash

Hogwash identifies machine-writing artifacts without making an authorship claim. These terms define the scanner, the agent-owned rewrite workflow, and rule synchronization.

## Language

**Finding**:
A rule match with exact raw-text offsets, a message, and a location. A finding never claims who wrote the text.
_Avoid_: Detection, verdict

**Actionable finding**:
A finding that the rewrite workflow must resolve before the candidate can be accepted.
_Avoid_: Blocking vote, confirmed finding

**Advisory finding**:
A visible review question that does not block acceptance or contribute to density.
_Avoid_: Review tier

**Baseline checklist**:
The immutable set of findings from the original scan, with a completion state for each row. Candidate rescans never replace it.
_Avoid_: Current report, working findings

**Candidate**:
The sibling document that the host agent rewrites and the user reviews. The original stays unchanged until acceptance.
_Avoid_: Fixed file, output document

**Accept**:
The approved atomic replacement of the original with its candidate.
_Avoid_: Apply fix, overwrite

**Waiver**:
An owner's recorded decision that one occurrence of one finding stays. Stored in `.hogwash/waivers.json`; the scan marks the finding waived, weightless, and not actionable.
_Avoid_: Ignore, suppression

**Baseline file**:
The frozen first scan of one original, written once to `.hogwash/<stem>-baseline.json` and removed by acceptance.

**Fingerprint**:
A digest of a file's actionable findings as a multiset of rule and normalised match. Two equal fingerprints mean the pass changed nothing the scanner sees.
_Avoid_: Hash, checksum

**Consultant**:
A configured model family that gives read-only advice about a candidate and its profiles in one call.
_Avoid_: Fixer, judge

**Rule pack**:
A versioned JSON collection of attributed scanner rules.
_Avoid_: Rule code

**Register**:
The writing context that selects stylometric baselines and rule weights: `technical`, `prose`, or `marketing`.
_Avoid_: Tone

**Density**:
The weighted actionable findings per 1,000 prose words.
_Avoid_: Authorship score

**Era**:
The model-generation cohort associated with a rule. Older cohorts can be marked deprecated.
_Avoid_: Source model

**Family**:
A model transport lineage such as Claude or Codex.
_Avoid_: Agent

**Snapshot**:
The normalized stored copy of a synchronization source used to calculate later changes.
_Avoid_: Cache

**Prose source**:
A human-written source about writing artifacts whose changed lines can receive drafting advice.

**Structured source**:
A machine-readable rule source that a deterministic mapper converts without a model call.

**Indexed fetch**:
A source whose first response lists the remaining bodies to fetch.

**Mapper**:
A pure conversion from a structured source body to proposed rule changes.

**Witness**:
A literal string derived from an upstream pattern and used as its matching example.

**Flood gate**:
The explicit cutoff that excludes weak statistical entries from a proposed rule pack.
_Avoid_: Filter

**Lineage pack**:
A rule pack with one license and one upstream lineage.
