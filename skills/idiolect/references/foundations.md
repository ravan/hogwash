# Foundations: the research behind Idiolect

An idiolect is a linguistics term: the language variety of a single person —
their own vocabulary, grammar, and habits. This skill exists to capture one.
Every design decision below is traced to published, verified research. When you
change the skill, keep each rule attached to its evidence or remove both.

## 1. Voice lives in small words and grammar, not adjectives

"Friendly and conversational" is not a voice profile. The stable, hard-to-fake
signal of authorship is mechanical:

- **Function words** (articles, prepositions, pronouns, conjunctions) have
  stable per-author rates and are topic-independent. This is the founding
  result of modern stylometry (Mosteller & Wallace 1964, the Federalist Papers;
  Stamatatos 2009 survey confirms function words and character n-grams as the
  most reliable, topic-resistant features).
- **Punctuation habits** are among the strongest single authorship indicators
  (Grieve 2007, head-to-head evaluation of 39 stylometric measures).
- **Pronouns and other "invisible" words** carry the most psychological
  information, and authors cannot self-report them accurately (Pennebaker,
  *The Secret Life of Pronouns*, 2011; Tausczik & Pennebaker 2010 on LIWC).
- **Grammar is a fingerprint too.** LLMs that avoid the giveaway vocabulary
  still keep a grammatical accent — overusing present participial clauses and
  nominalizations relative to human genre norms (Reinhart et al. 2025, PNAS).
- Linguistic style is a stable individual difference, consistent across a
  person's documents (Pennebaker & King 1999), so it is worth profiling once
  and reusing.

**Rules this produces:** the profile has a Mechanics section and a
Function-word fingerprint section with checkable habits, not personality
adjectives. Rewrites must match grammar-level habits, not just swap words.

## 2. One core, many registers

The same person legitimately writes a blog post, a whitepaper, an email, and a
chat message differently:

- Texts vary continuously along dimensions such as involved vs informational;
  there is no single "written style" per person (Biber 1988, *Variation across
  Speech and Writing*).
- Register (situational), genre (conventional structure), and style
  (individual choice) are distinct layers; individual style is the residue
  after register and genre conventions are accounted for (Biber & Conrad,
  *Register, Genre, and Style*).
- Writers adapt toward or away from their audience deliberately
  (Communication Accommodation Theory; Giles & Ogay 2007). Different registers
  for different readers is not inconsistency, and the truest baseline shows
  when writing to peers.
- Every sample can be tagged by field (topic), tenor (relationship), and mode
  (channel) — Halliday & Hasan 1985. The register overlay files are this
  tagging made durable.

**Rules this produces:** `voice.md` holds only what survives a change of
format and topic; `registers/*.md` hold the per-context deltas; a trait goes
into the core only when seen (or reported) across at least two contexts.

## 3. Self-report is calibration, not ground truth

Many users have no corpus. The interview must be built to psychometric
standards, and its answers must be verified behaviorally:

- Bipolar adjective scales reliably measure connotative judgments (Osgood et
  al. 1957, the semantic differential).
- Several small items beat one big question (Likert 1932).
- Scale points anchored with concrete example behaviors are far less ambiguous
  than bare numbers; anchors must "retranslate" — an independent reader should
  sort each example back to its intended scale point (Smith & Kendall 1963,
  behaviorally anchored rating scales). That is why every interview question
  shows the same message rendered at three positions.
- Language behavior is a better personality measure than questionnaires;
  self-description and observed language diverge (Boyd & Pennebaker 2017;
  Mairesse et al. 2007 found observer ratings easier to model than
  self-ratings).
- The NN/g four tone dimensions (funny–serious, formal–casual,
  respectful–irreverent, enthusiastic–matter-of-fact) are a practical,
  user-tested semantic-differential instrument for tone (Moran, Nielsen Norman
  Group).

**Rules this produces:** interview answers are recorded as `reported`, never
`confirmed`. The interview ends with a behavioral step: contrasting draft
pairs the user chooses between and edits. A dimension becomes `confirmed`
only through observed text or the user approving it in action.

## 4. Culture is a prior, never a label

Culture shapes writing style, and the skill must handle it without
stereotyping:

- Erin Meyer's Culture Map (2014) gives eight scales; four directly shape
  prose: **Communicating** (low-context explicit vs high-context implicit),
  **Evaluating** (frank vs diplomatic negative feedback), **Persuading**
  (principles-first vs applications-first), **Disagreeing** (open vs
  avoided). These four are dimensions 5–8 of the profile.
- The underlying context idea is Hall 1976 (*Beyond Culture*): meaning carried
  explicitly vs by shared context — a continuum, not a binary.
- National culture scores describe populations, not people. Applying them to
  an individual is a formal statistical error, the ecological fallacy (Brewer
  & Venaik 2014; McSweeney 2002 on Hofstede). Meyer's own materials note wide
  individual variation, and that positions are relative to the reader: direct
  for one audience, indirect for another.
- First-language influence on English prose is real (Kaplan 1966, contrastive
  rhetoric) but must be detected in text, not predicted from a name or
  passport — the essentializing reading of Kaplan is the field's own main
  criticism (Connor 2002). L1-shaped patterns are voice features to preserve,
  not errors to normalize.

**Rules this produces:** culture questions in the interview open a
conversation and set the starting point of a slider; the profile stores the
individual's measured position, never a nationality. The Heritage section
preserves dialect and idiom the user wants kept. Never write "you do X because
you are from Y."

## 5. What makes text read as machine-made

The profile and its application must attack the known statistical signatures
of LLM prose:

- **Uniformity.** Human text has more scattered sentence-length distributions,
  more varied vocabulary, more negation and pronouns; LLM text is measurably
  smoother (Muñoz-Ortiz et al. 2024). Match the author's sentence-length
  *variance*, not just the mean. This is dimension 13 (Rhythm).
- **Excess vocabulary.** Post-LLM corpora show marker words at up to 28x their
  human rate ("delves", "underscores", "showcasing") (Kobak et al. 2025,
  Science Advances; word lists at github.com/berenslab/llm-excess-vocab).
  Marker vocabulary seeds the ban list, but matching the author's own word
  rates matters more than avoiding a global list.
- **Adjective inflation** ("commendable", "meticulous", "intricate") betrays
  LLM editing even when single documents pass (Liang et al. 2024, ICML).
- **Contamination.** Co-writing with a model measurably homogenizes authors'
  lexical choices toward the model's defaults (Padmakumar & He 2024). Never
  learn profile rules from AI-assisted or unreviewed generated text.
- **Detectors are not truth.** Perplexity/burstiness heuristics are useful
  diagnostics but biased and breakable — over half of non-native-speaker TOEFL
  essays were misclassified as AI (Liang et al. 2023, Patterns; Sadasivan et
  al. 2023). "Passes a detector" is neither the goal nor the gate.
- **Humans can't gut-check it either.** People detect AI text at chance, and
  their heuristics are exploitable; what they actually read as human is first
  person, contractions, personal specifics, informality (Jakesch, Hancock &
  Naaman 2023, PNAS). So preserve the author's contractions, self-reference,
  and concrete detail — and never rely on "reads fine to me" alone.

## 6. Applying a voice: what actually works

- Prompting an instruction-tuned model with "here are samples, imitate them"
  is a weak baseline; models struggle to reproduce individual style from a
  sample alone (Khan et al. 2023, arXiv:2312.17242). The profile's explicit,
  checkable rules exist to close that gap.
- Few-shot exemplars still help enormously, and completion framing ("continue
  this author's text") beats instruction framing (Jemama 2025,
  arXiv:2509.24930: up to 23.5x better style match than zero-shot).
- Retrieve the few exemplars that help this task — matched by register,
  audience, and task — rather than stuffing the whole archive into context
  (Mysore et al., Pearl, arXiv:2311.09180; Salemi et al., LaMP, ACL 2024).
- The hard case is informal, implicit voice — chat, forum, personal blog —
  where imitation measurably fails most (arXiv:2509.14543, EMNLP 2025
  Findings). Expect more iterations there.

## 7. Judging the result

- Style transfer is evaluated on three independent axes: style strength,
  content preservation, fluency (Jin et al. 2022, *Computational
  Linguistics*). One blended score hides the failure mode.
- Human review needs a precise, anchored rubric; ad-hoc "does this sound like
  me?" is the unreproducible protocol the field criticizes (Briakou et al.
  2021, GEM).
- Most automatic style metrics were never validated against human judgment
  (Ostheimer et al. 2023, ACL Findings). Validate any score against the
  owner's own verdicts before trusting it; metric ensembles beat any single
  evaluator (Jangra et al., arXiv:2508.06374).
- The strongest test is an authorship-attribution mindset: would an analyst
  comparing the piece to the owner's real corpus attribute it to them? LLM
  imitations that copy surface features still fail attribution (Mikros 2025,
  *Digital Scholarship in the Humanities*).

## 8. Spoken voice is a gradient, not a switch

- Speech is involved and fragmented; writing is integrated and detached —
  measurably different feature sets (Chafe 1982).
- But the oral–literate line is a continuum, and good writing borrows oral
  involvement strategies (Tannen 1982; Biber 1988's involved–informational
  dimension is the corpus-quantified version).

**Rules this produces:** dimension 16 (Orality) is a gradient in the core
profile; spoken formats (talks, videos, podcasts) are registers like any
other; transcripts are valid corpus material once transcription artifacts are
noted.

## Source list

Stylometry and psychology: Mosteller & Wallace 1964; Stamatatos 2009
(doi:10.1002/asi.21001); Burrows 2002 (Delta); Grieve 2007; Pennebaker & King
1999; Tausczik & Pennebaker 2010; Pennebaker 2011; Mairesse et al. 2007
(JAIR); Yarkoni 2010; Boyd & Pennebaker 2017; Ireland & Pennebaker 2010
(language style matching).

Register: Biber 1988; Biber & Conrad 2009/2019; Halliday & Hasan 1985; Giles &
Ogay 2007 (CAT).

Measurement: Osgood, Suci & Tannenbaum 1957; Likert 1932; Smith & Kendall 1963
(BARS); Moran, NN/g tone dimensions
(nngroup.com/articles/tone-of-voice-dimensions/).

Culture: Meyer 2014 (erinmeyer.com); Hall 1976; Hofstede 2010
(geerthofstede.com) with Brewer & Venaik 2014 and McSweeney 2002; Kaplan 1966;
Connor 2002.

AI text and personalization: Kobak et al. 2025 (Science Advances, adt3813);
Liang et al. 2024 (ICML, arXiv:2403.07183); Muñoz-Ortiz et al. 2024
(arXiv:2308.09067); Padmakumar & He 2024 (arXiv:2309.05196); Liang et al. 2023
(Patterns); Sadasivan et al. 2023 (arXiv:2303.11156); Jakesch, Hancock &
Naaman 2023 (PNAS); Khan et al. 2023 (arXiv:2312.17242); Jemama 2025
(arXiv:2509.24930); arXiv:2509.14543; Mysore et al. (Pearl, arXiv:2311.09180);
Salemi et al. 2024 (LaMP, 2024.acl-long.399); Reinhart et al. 2025 (PNAS);
Mikros 2025 (DSH).

Evaluation: Jin et al. 2022 (2022.cl-1.6); Briakou et al. 2021 (2021.gem-1.6);
Ostheimer et al. 2023 (2023.findings-acl.687); Jangra et al.
(arXiv:2508.06374).

Speech vs writing: Chafe 1982; Tannen 1982.
