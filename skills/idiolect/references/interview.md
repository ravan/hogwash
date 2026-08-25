# The interview: build a profile with no writing samples

For users who write code, not documents. They cannot answer "describe your
prose style" — but shown the same message written three ways, anyone can point
at the one that sounds like them. That is the whole method, and it is the
validated one: bipolar scales (Osgood), several small items instead of one big
question (Likert), and every scale point anchored with a concrete example
(Smith & Kendall's behaviorally anchored rating scales). See
[foundations](foundations.md), section 3.

## How to run it

- Set the expectation first: the full interview takes two or three short
  sessions and can pause anytime. It resumes cleanly — the interview record in
  `evidence.md` shows exactly where it stopped.
- Create the profile directory from the templates when the interview starts,
  and record answers as they arrive, not at the end.
- Never dump the whole questionnaire. Phase 0 fits in one message; in the
  anchored phases, ask one or two dimensions per message, never a whole phase.
- For every dimension, show the anchored examples, then ask for 1–5. Where the
  harness supports structured questions, offer the anchors as options with the
  example text as the preview (trim anchors to fit, keeping the one-dimension
  discipline). Without that support, plain prose with the anchors as a short
  list works fine. Positions 2 and 4 mean "between the shown examples".
- Always allow: "skip", "depends on the situation" (record which situations —
  that is a register split, a finding, not a failed answer), and the user's
  own rewrite of the example ("none of these — I'd say it like this"). A user
  rewrite is the best possible answer: record it as evidence, not just a
  number.
- Record every answer in `evidence.md` (interview record) with the user's own
  words. Positions land in `voice.md` tagged `reported`.
- Self-report is calibration, not ground truth (Boyd & Pennebaker 2017). Never
  skip Phase 6, the behavioral check — it is what turns `reported` into
  `confirmed`.
- The anchors below hold everything constant except the target dimension. When
  you improvise new anchors, keep that discipline, and keep them short.
- **Transpose every base situation into the owner's world before showing it.**
  The anchors below are written once, in an engineering setting, as the
  canonical form — they are templates, not scripts. Rebuild each base
  situation from the Phase 0 role-and-purpose answer, changing nothing else:
  same 1/3/5 scale, same length, same single varied dimension. A CFO gets a
  quarter gone wrong, a sales lead a deal update, a support manager an
  escalation, a designer a critique. "Topic-boring" means boring inside the
  owner's own world; a scenario the owner has never lived (a production
  outage, for most executives) measures their imagination, not their voice.
  Show the engineering anchors verbatim only to owners whose work is
  engineering. Worked transposition of dimension 1 for a CFO writing board
  memos — bad news, one wrong number, now corrected:
  - **1** "In Q3 we recorded an unexpected inventory write-down. This memo
    covers the impact and the corrective controls."
  - **3** "Q3 took a hit from one bad inventory number. Here's what happened
    and what we changed."
  - **5** "Q3's plot twist: one inventory number went on an adventure. Story
    time."

## Phase 0 — Map the territory

Plain questions, no scales:

1. What is your role, and what will this voice be used for? (A CFO writing
   board memos, a founder writing investor updates, an engineer writing
   design docs, a manager writing performance reviews — any answer works.
   This sets the world every anchored example is transposed into, names who
   must sound like the owner, and lands in the portrait.)
2. What do you actually write in a normal month? (Offer: email, chat, code
   review comments, blog, docs, whitepapers, decision docs, social posts,
   talks/videos. Multi-select.)
3. Which one matters most to get right first?
4. Who reads each one, and what do they already know? (Sets tenor; drives
   register overlays.)
5. Is there a writer or a specific piece — by anyone — where you thought
   "that's how I wish I sounded"? (Aspiration is allowed; record it as
   *desired* voice, distinct from observed habits.)
6. Do you have ANY authentic past writing — sent emails, Slack history, README
   files, commit messages, code comments? Commit messages and review comments
   count. If yes, ask the owner to point at the directory or files that hold
   it — never hunt for samples yourself — then run
   [corpus capture](corpus.md) on that material alongside this interview.

## Phase 1 — Tone (dimensions 1–4)

Canonical base situation (transpose it into the owner's world — see How to
run it): a work message about a production outage caused by one wrong config
value, now fixed. The constant shape: something went wrong from one small
cause, it is fixed, the owner writes it up.

### 1. Gravity — serious ↔ playful

Ask: when something goes wrong and you write it up, how much lightness is
allowed in?

- **1** "On Friday we deployed an incorrect configuration value to production.
  This summary covers the impact and the fix."
- **3** "Friday's outage came down to one wrong config value. Here's what
  happened and what we changed."
- **5** "Friday we speedran an outage: one config value, straight to
  production. Story time."

### 2. Formality — formal ↔ casual

Ask: how dressed-up is your default sentence?

- **1** "The incident was caused by an incorrect configuration value.
  Remediation is complete."
- **3** "The outage came from a wrong config value. It's fixed now."
- **5** "yeah the outage was one dumb config value. fixed."

### 3. Reverence — respectful ↔ irreverent

Ask: how do you treat process, convention, and sacred cows?

- **1** "In line with our change-management policy, we have completed the
  post-incident review and filed the findings."
- **3** "Post-incident review is done. Two findings are worth your time."
- **5** "The post-incident ritual is complete. The form asked twelve
  questions; two of them mattered."

### 4. Energy — matter-of-fact ↔ enthusiastic

Base shifts to good news: a cache cut page load from 40 seconds to 4.

- **1** "The new cache reduces page load from 40 seconds to 4."
- **3** "The new cache took page load from 40 seconds down to 4. Worth rolling
  out everywhere."
- **5** "The new cache is a huge win — 40 seconds down to 4! Let's get it
  everywhere!"

## Phase 2 — Directness (dimensions 5–8)

These four axes come from cross-cultural communication research (Meyer 2014;
Hall 1976) — see [foundations](foundations.md), section 4. Introduce the
phase with one line: "These vary a lot between cultures and workplaces;
there's no right answer." If the user names a cultural or workplace norm they
are balancing ("at home directness is normal; my US colleagues read it as
rude"), record both poles and ask which one the PROFILE should encode — that
often becomes a per-register or per-audience split. Never guess any of these
from someone's name, nationality, or first language.

### 5. Explicitness — spells everything out ↔ trusts shared context

Base: telling a teammate that Tuesday's release removes an endpoint their
service still calls.

- **1** "Your service calls /v1/users. That endpoint is removed in Tuesday's
  release. Migrate to /v2/users before Tuesday or your service will fail."
- **3** "Heads up: /v1/users goes away Tuesday, and your service still calls
  it."
- **5** "You've seen the /v2 migration notes for Tuesday, right?"

### 6. Criticism — frank ↔ diplomatic

Base: reviewing a colleague's design that has a real flaw.

- **1** "This design doesn't work: the queue is a single point of failure."
- **3** "One real problem: the queue is a single point of failure. The rest
  holds up."
- **5** "Solid start. One thing worth exploring together is whether the queue
  might become a bottleneck in some scenarios."

### 7. Argument order — principle first ↔ example first

Base: arguing that a module needs tests.

- **1** "Untested code cannot be changed safely — that's the principle. This
  module has no tests, so last week a one-line change broke checkout for
  three hours."
- **3** "This module needs tests. Last week a one-line change broke checkout
  for three hours, and nothing caught it."
- **5** "Last week a one-line change broke checkout for three hours. Nothing
  caught it — this module has no tests. Untested code can't be changed
  safely."

Also ask: in a long document, does your conclusion come first or last?

### 8. Disagreement — states it ↔ routes around it

Base: a colleague proposes adding Kafka; the user thinks Postgres is enough.

- **1** "I disagree. Postgres handles this load fine, and Kafka is complexity
  we'd pay for daily."
- **3** "I'd push back on Kafka here — Postgres handles this load."
- **5** "Before we commit to Kafka, could we list what Postgres can't do for
  this load? Might be worth a spike first."

## Phase 3 — Stance (dimensions 9–12)

### 9. Certainty — asserts ↔ hedges

Base: naming a bug's location from strong-but-not-total evidence.

- **1** "The bug is in the retry logic."
- **3** "The bug is almost certainly in the retry logic."
- **5** "It looks like the retry logic might be involved, though there could
  be other factors."

Also ask: where do you genuinely hedge? (Estimates? Other people's code?)
Honest hedging on real uncertainty is voice, not weakness.

### 10. Self — I am in the text ↔ invisible

- **1** "I tried three approaches, and I'm convinced the cache is the right
  one."
- **3** "After trying three approaches, the cache won."
- **5** "Three approaches were evaluated; caching proved most effective."

### 11. Reader — speaks to "you" ↔ writes past the reader

- **1** "You've probably hit this: you deploy, and the config silently
  reverts. Here's why."
- **3** "Anyone who deploys often has seen a config silently revert. Here's
  why."
- **5** "Deployed configuration values can silently revert under the
  following conditions."

### 12. Ground — concrete ↔ abstract

- **1** "Page load dropped from 40 seconds to 4 after we moved session
  lookups into Redis 7.2."
- **3** "Page load dropped tenfold after we cached session lookups."
- **5** "Performance improved substantially after optimizing the data-access
  layer."

## Phase 4 — Texture (dimensions 13–16)

### 13. Rhythm — even ↔ bursty

Uniform rhythm is the single strongest machine tell (foundations, section 5).

- **1** "The migration finished on Tuesday without any downtime. The team
  moved all traffic to the new cluster gradually. Every service stayed within
  its latency budget throughout."
- **3** "The migration finished Tuesday with no downtime. Traffic moved
  gradually, and every service stayed inside its latency budget."
- **5** "The migration finished Tuesday — all traffic, moved gradually, every
  service inside its latency budget, no downtime, none of the drama we'd
  budgeted a weekend for. It just worked."

### 14. Density — spare ↔ elaborated

- **1** "The cache fixed it. Deploys take 4 seconds now."
- **3** "Once we wired the cache into the session path, deploys dropped to 4
  seconds."
- **5** "The cache — once we'd finally wired it into the session path, which
  took longer than any of us would like to admit — fixed it, and deploys now
  take four seconds."

### 15. Imagery — literal ↔ figurative

- **1** "The scheduler assigns each job to the least-loaded node."
- **3** "The scheduler seats each job at the emptiest table."
- **5** "The scheduler is a maître d' at a busy restaurant: every arriving
  job gets walked to the emptiest table, and when the room fills up, a new
  dining room spins up next door."

Also ask: when you do reach for an analogy, what world does it come from?
(Cooking, sport, machines, family life?) That source domain is deeply
personal.

### 16. Orality — reads like print ↔ reads like talk

- **1** "There are two reasons this fails in production."
- **3** "So why does this fail in production? Two reasons."
- **5** "Look, this fails in production for two reasons. Bear with me — the
  second one is the interesting one."

## Phase 5 — The person behind the prose

Open questions, no scales. These fill Heritage, Mechanics, and Lexicon.

1. **Variety of English.** Which English is yours (en-GB, en-US, en-ZA, en-IN,
   ...)? Words or expressions from home, another language, or your region
   that you use and want KEPT? Anything editors or spellcheckers keep "fixing"
   that you want left alone?
2. **First language.** If English is not your first language: are there
   patterns from your first language you want preserved (they are voice, not
   errors), and any you'd rather have quietly smoothed out? Their call, both
   directions.
3. **Mechanics quick-fire.** Contractions always/sometimes/never? Emoji —
   which, where? Exclamation marks? Em-dashes, semicolons, parentheses — love
   or ban? Oxford comma? Bullets vs prose? Bold/italics? How do you open and
   sign off an email? A chat message?
4. **Pet phrases.** Things you actually say or type often — including spoken
   tics if a talk register is planned. These go to "Words I reach for",
   flagged: options, never quotas.
5. **Allergies.** Words or phrases that make you cringe. For each: soft avoid
   (default with a replacement) or hard ban (never, anywhere)? Only what the
   user declares becomes a ban. Offer the machine-vocabulary seed list
   (foundations, section 5) as candidates to accept or reject one by one —
   rejections matter too.
6. **Humor.** When you're funny, how? Dry one-liner, self-deprecation,
   absurdist tangent, wordplay? Where is humor off-limits?

## Phase 6 — Behavioral check (mandatory)

Self-report drifts from behavior, so verify before writing `calibrated` on
anything:

1. Pick the register from Phase 0 question 2. Write two SHORT paragraphs of
   identical content: candidate A built strictly from the recorded answers,
   candidate B deliberately shifted on the 3–4 least-sure dimensions — a
   skipped answer, a "depends" with no register pattern, a 3, or an answer
   the user changed. Do not label which is which.
2. Ask: which sounds more like you — and, more important, which exact words
   feel wrong? Invite them to edit either candidate directly.
3. Every correction updates a dimension or mechanics rule. A confirmed choice
   upgrades those dimensions to `confirmed`. User edits are first-class
   evidence — quote them in `evidence.md`.
4. Repeat once for a second register if one exists. Two contexts are the
   minimum to call anything core rather than register-specific.

Create register overlays only for registers that have evidence or a
behavioral check behind them. The other formats named in Phase 0 go in the
core profile's Unknowns as overlay candidates, not as empty files.

The profile ships as `provisional` until at least one real piece has gone
through [refinement](refine.md) with the user's verdicts recorded.

## Maintaining the question bank

This bank is meant to be tweaked. Rules for changing it:

- Every question must map to a named profile field. A question whose answer
  has nowhere to land gets dropped.
- Anchors must retranslate: a reader who did not write them should place each
  anchor back on its intended scale point (Smith & Kendall 1963). Test new
  anchors on the user before trusting them; if they misplace one, rewrite it.
- Anchors must vary ONLY the target dimension. If two anchors differ in both
  formality and certainty, the answer measures neither.
- Keep anchors topic-boring on purpose: topic is not style, and a vivid topic
  contaminates the judgment. Topic-boring never means work-alien — the base
  situation lives in the owner's world (see the transposition rule in How to
  run it); it is the drama, not the domain, that gets kept flat.
- Retire questions users consistently answer "depends" without a register
  pattern — they are measuring the situation, not the person.
- Log bank changes in the skill's own git history, with the failure that
  motivated them.
