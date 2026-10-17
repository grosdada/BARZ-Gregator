# Lot 3A — Mechanical extraction of Prompt Atlas V5 prompt sources

Completed on 2026-09-11. This lot is an evidence-preserving extraction, not a
semantic migration.

Pilot review update (2026-09-11): BZ Enhancer exposed missing `data-prompt`
values and inline-handler string literals. Sol repaired these gaps, the handling
of regex/template literals, raw provenance and missing server-side prompt
sources. The figures below are extraction statistics, not exhaustive semantic
coverage. See [the pilot review and repair record](migration/reviews/README.md).
Reviewed content stays outside the regenerable extraction tree.

## Scope and safety

- Source tree read in place: `E:\Fable 5-Project\Meat Journey`.
- Generated artifacts live only under `suite-v6/migration/atlas-v5/`.
- Legacy JavaScript and HTML scripts are scanned as text and are never executed.
- `BZ Image DNA` (`soul-prompts`) is excluded by ID and filename.
- `SOUL-PROMPTS-v02.html` and `photo-dna-presets.json` are explicit denylisted
  sources and do not appear in the manifest or corpus.
- Values resembling API credentials are omitted. The repaired scan found no
  actual credential-shaped literal in V5; a fixture keeps this gate tested.
- The extractor refuses to write its output inside the legacy source tree.

## Result after the Sol repair

- Registry entries: 27, representing 26 distinct tool IDs.
- Included tools: 25; excluded tools: 1 (`BZ Image DNA`).
- Source graph: 38 files, including APG data, the Acting Gen dance bank,
  server instructions, eight Markdown instruction sources and imported server modules.
- Extracted occurrences: 20,666.
- Deduplicated values: 13,317.
- Heuristic buckets: 1,891 `likely-prompt`, 4,897 `review-candidate`, and 6,529
  `context-only` values retained for coverage but not scheduled for first-pass
  semantic review.
- Candidate text volume: approximately 180,814 tokens using the deliberately
  rough characters-divided-by-four estimate. This is not a Codex billing or
  quota prediction.

The review plan contains 39 batches, split first by 38 physical sources and
then into parts capped at roughly 15,000 candidate-text tokens. Each part
includes decoded candidate text, raw source fragments, source location, literal
kind, enclosing function when detectable, and owning tool IDs. Visible HTML
text is whitespace-normalized for review while its raw fragment remains
available. Repeated values have one canonical identity and every occurrence
remains traceable.

Largest first-pass source families:

| Source family | Approx. candidate tokens |
| --- | ---: |
| Acting Gen + dance bank | 22,486 |
| Video Multi Framing + model/directing documents | 20,411 |
| Server-side shared instructions | 5,355 |
| BZ Multishot | 15,202 |
| Simple Prompt Builder | 14,871 |
| Knolling Board Generator | 13,059 |
| Native Atlas shell | 8,574 |

## Mechanical repairs verified

- `data-prompt` values and strings in inline handlers are extracted without
  executing the legacy code.
- Regex contents are no longer misidentified as JavaScript strings.
- Nested templates, escaped strings, CRLF continuation and HTML entities have fixtures.
- Raw fragments remain attached to occurrences; decoded text remains searchable.
- Server system instructions and the eight prompt/reference Markdown documents
  they load are in the source graph with owning tool IDs.
- BZ Enhancer now contains its nine grid cells, including eight selectable angles,
  and all three non-empty preservation prefixes.
- The corpus no longer contains the long code-shaped false positives sampled
  from the previous scanner.

## Artifacts

- `coverage.json`: counts, safety result, source/corpus digest, exclusion gate.
- `source-manifest.json`: source hashes, owners and dependency edges.
- `prompt-literals.json`: deduplicated corpus with every occurrence.
- `review-batches.json`: resumable review plan and per-batch estimates.
- `review-batches/*.json`: compact, source-local payloads for semantic review.
- `migration/reviews/`: durable semantic reviews, not erased by regeneration.

## Gate before migration

This gate was subsequently passed for BZ Enhancer, Imperfection Engine and
BZ Goodies; all three are now integrated and tested in V6 (see
`LOT-3B-STATUS.md` and `LOT-3C-STATUS.md`). Every later family must still distinguish
actual prompt content, composition fragments, system instructions, UI copy, and
code-only strings. The native shell and shared server batch still need semantic
subdivision by function/feature before review.

The extractor remains deliberately static and heuristic. Passing its fixtures
does not establish semantic completeness or V5/V6 runtime equivalence.

Verification after the repair: 112 full workspace tests pass, with no failure.
