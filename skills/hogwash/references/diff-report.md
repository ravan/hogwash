# Render the diff report

The diff report is a standalone HTML redline: each changed passage as original beside revision with word-level removed/added marks, the before-and-after scanner stats, and a table of owner-waived findings. The script computes everything mechanical itself. It rescans both files with the waivers file applied, aligns the paragraphs, diffs the words, numbers the lines, names the sections, and attaches the rule chips. You supply only the judgment fields, as JSON in a scratch file, so none of it passes through the conversation.

Offer the report at the review gate, and render it whenever the user asks for a visual or shareable diff.

1. Write the judgment JSON to a scratch file, never into the project. Every field is optional; `{}` is valid:

   ```json
   {
     "title": "Post title",
     "subtitle": "One line of context under the title",
     "intro": "One sentence on how the edits were made",
     "factsAltered": 0,
     "scores": { "readsHuman": [7, 8], "contentQuality": [8, 8] },
     "waived": [
       { "line": 54, "rule": "vale.figurative-quantities.a-handful", "match": "a handful", "reason": "Verbatim ECB quotation." }
     ],
     "annotations": [{ "line": 197, "label": "voice: not-this-but-that" }],
     "footer": "Extra closing sentence."
   }
   ```

   `waived` rows fill the "findings left standing" table: restate every entry of `.hogwash/waivers.json` that belongs to this original, with the line from the baseline; `annotations` add judgment chips (a voice edit, for example) to the passage whose original line range contains that line; `scores` and `factsAltered` restate the review-gate judgment. Take the line numbers from the baseline file.

2. Run it with the same register as the baseline scan:

   ```sh
   bun "$SKILL/scripts/hogwash.ts" diff-report --notes <scratch>/notes.json --register <register> <original>
   ```

The candidate is the usual sibling (`docs/post.md` pairs with `docs/post-hogwash.md`) and must exist. The report lands in `.hogwash/<name>-diff.html` unless `--out` names another path; the command prints the path it wrote. Report that path to the user and do not paste the HTML into the conversation. Adding `--open` also launches the written report in the system's default browser: when the user has already asked to see the report, pass it on the same run; otherwise offer opening it as one of the choice options after rendering. The report is a view, not a gate: it never replaces the review-handoff summary, and rendering it approves nothing.
