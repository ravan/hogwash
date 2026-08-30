# Rewrite-probe eval, 2026-08-30

This eval led to the probe's removal: the edit share carries no usable
positive signal, so the `probe` command and its config flags were deleted.
The numbers stay here as the evidence.

One probe call per document per family: the model rewrites the document and
the edit share is the normalized token Levenshtein distance (scripts/probe.ts).
Documents: six per HAP-E mini class (human, GPT-4o, Llama-3-8B-Instruct;
two acad, two blog, one fic, one news each) plus the three Claude-written
ai-claude fixtures. One codex call failed on human/blog/0017 and is omitted.

Reading: Claude-written text always probes at or under 0.07 under a Claude
probe, but two of six humans probe under 0.07 too, so a low share is no
evidence of machine writing. Codex separates nothing, including GPT-4o text
from its own family. Only the negative reading holds: a share well above 0.1
from a same-family probe argues against that family having written the text.

| probe family | class | document | edit share |
| --- | --- | --- | --- |
| claude-opus-5 | human | human/acad/0005.md | 0.1946 |
| claude-opus-5 | human | human/acad/0031.md | 0.086 |
| claude-opus-5 | human | human/blog/0016.md | 0.1423 |
| claude-opus-5 | human | human/blog/0017.md | 0.0975 |
| claude-opus-5 | human | human/fic/0002.md | 0.0288 |
| claude-opus-5 | human | human/news/0002.md | 0.0594 |
| claude-opus-5 | gpt4 | gpt4/acad/0005.md | 0.0768 |
| claude-opus-5 | gpt4 | gpt4/acad/0031.md | 0.0852 |
| claude-opus-5 | gpt4 | gpt4/blog/0016.md | 0.0516 |
| claude-opus-5 | gpt4 | gpt4/blog/0017.md | 0.2288 |
| claude-opus-5 | gpt4 | gpt4/fic/0002.md | 0.1642 |
| claude-opus-5 | gpt4 | gpt4/news/0002.md | 0.1562 |
| claude-opus-5 | llama | llama/acad/0005.md | 0.19 |
| claude-opus-5 | llama | llama/acad/0031.md | 0.2059 |
| claude-opus-5 | llama | llama/blog/0016.md | 0.0538 |
| claude-opus-5 | llama | llama/blog/0017.md | 0.1388 |
| claude-opus-5 | llama | llama/fic/0002.md | 0.1344 |
| claude-opus-5 | llama | llama/news/0002.md | 0.1649 |
| claude-opus-5 | claude | ai-claude/technical.md | 0.0467 |
| claude-opus-5 | claude | ai-claude/prose.md | 0.0406 |
| claude-opus-5 | claude | ai-claude/marketing.md | 0.0698 |
| codex gpt-5.6-sol | human | human/acad/0005.md | 0.4205 |
| codex gpt-5.6-sol | human | human/acad/0031.md | 0.4633 |
| codex gpt-5.6-sol | human | human/blog/0016.md | 0.2197 |
| codex gpt-5.6-sol | human | human/blog/0017.md | failed |
| codex gpt-5.6-sol | human | human/fic/0002.md | 0.4095 |
| codex gpt-5.6-sol | human | human/news/0002.md | 0.2527 |
| codex gpt-5.6-sol | gpt4 | gpt4/acad/0005.md | 0.397 |
| codex gpt-5.6-sol | gpt4 | gpt4/acad/0031.md | 0.215 |
| codex gpt-5.6-sol | gpt4 | gpt4/blog/0016.md | 0.2318 |
| codex gpt-5.6-sol | gpt4 | gpt4/blog/0017.md | 0.3764 |
| codex gpt-5.6-sol | gpt4 | gpt4/fic/0002.md | 0.3829 |
| codex gpt-5.6-sol | gpt4 | gpt4/news/0002.md | 0.3105 |
| codex gpt-5.6-sol | llama | llama/acad/0005.md | 0.2222 |
| codex gpt-5.6-sol | llama | llama/acad/0031.md | 0.5756 |
| codex gpt-5.6-sol | llama | llama/blog/0016.md | 0.2517 |
| codex gpt-5.6-sol | llama | llama/blog/0017.md | 0.4159 |
| codex gpt-5.6-sol | llama | llama/fic/0002.md | 0.4829 |
| codex gpt-5.6-sol | llama | llama/news/0002.md | 0.238 |
| codex gpt-5.6-sol | claude | ai-claude/technical.md | 0.4048 |
| codex gpt-5.6-sol | claude | ai-claude/prose.md | 0.1407 |
| codex gpt-5.6-sol | claude | ai-claude/marketing.md | 0.2622 |
