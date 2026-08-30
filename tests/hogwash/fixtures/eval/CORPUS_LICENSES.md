# Corpus document licences

The code in this repository is MIT. The corpus documents below carry their own
licences and provenance. Each entry names the file, the source, and the terms.

| file | source | licence | notes |
| --- | --- | --- | --- |
| `ai-gpt/essay-1.md` | [ghostbuster-data](https://github.com/vivek3141/ghostbuster-data) `essay/gpt/1.txt`, Verma et al., NAACL 2024 | CC BY 3.0 | ChatGPT output |
| `ai-gpt/essay-2.md` | [ghostbuster-data](https://github.com/vivek3141/ghostbuster-data) `essay/gpt/10.txt`, Verma et al., NAACL 2024 | CC BY 3.0 | ChatGPT output |
| `human-article/wiki-intro.md` | Wikipedia, "Stepping on Roses" introduction (pre-2023 snapshot) via [GPT-wiki-intro](https://huggingface.co/datasets/aadityaubhat/GPT-wiki-intro) | CC BY-SA | Wikipedia contributors |
| `human-mail/enron-project-update.md` | Enron email corpus via [Yale-LILY/aeslc](https://huggingface.co/datasets/Yale-LILY/aeslc) | public record | 1999-2002 business email, released through FERC |
| `human-marketing/celsius-press-release.md` | [SEC EDGAR 8-K exhibit 99.1](https://www.sec.gov/Archives/edgar/data/1341766/000121390019010954/f8k061819ex99-1_celsiushold.htm), Celsius Holdings, 2019-06-18 | public filing | company copyright persists; press releases are written for republication |
| `human-edited-draft/beemo-generation.md` | [toloka/beemo](https://huggingface.co/datasets/toloka/beemo) id 613, Artemova et al., NAACL 2025 | MIT | expert-edited Llama-2-7b draft |
| `hape-human/*.md`, `hape-gpt4o/*.md`, `hape-llama3/*.md` | [HAP-E mini](https://huggingface.co/datasets/browndw/human-ai-parallel-corpus-mini), Reinhart et al. | MIT | paired ~500-word continuations: human, GPT-4o, and Llama-3-8B-Instruct each continue the same human-written opening; human sources are pre-LLM (Elsevier articles, US news, public-domain fiction, blogs) |

The pastiche fixtures in `tests/hogwash/fixtures/corpus/` (renamed from `human-*`
on 2026-08-30) and the ai-claude documents were written by Claude for this
repository and are MIT like the code. None of them are human text; the
genuinely human documents are the ones with external provenance above.
