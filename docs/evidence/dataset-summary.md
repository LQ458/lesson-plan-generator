# Original dataset aggregate

Collected on 2026-07-23 from one authoritative copy of the original private
K–12 curriculum chunk store. A deployment mirror with the same aggregate was
excluded so that records were not counted twice.

| Metric | Definition | Value | Method |
| --- | --- | ---: | --- |
| JSON source files | `.json` files under the counted chunk root | 1,556 | Recursive enumeration |
| Parsed files | Files successfully read and parsed as JSON | 1,556 | UTF-8 read and `JSON.parse` |
| Parse failures | Read or JSON parse failures | 0 | Exception count |
| Total chunks | Records in a top-level array or `.chunks` array | 95,360 | Sum of array lengths |
| Aggregate bytes | Serialized size of counted JSON files | 240,594,877 | Sum of file sizes |
| Explicit quality scores | Chunks with numeric `qualityScore` or `quality_score` | 14,394 (15.09%) | Finite-number field check |

The aggregate byte count is 240.595 MB in decimal units or 229.45 MiB. It
includes JSON structure and metadata, not only curriculum text.

## Reproduction

Run the included read-only script against an authorized private chunk-store
root:

```bash
node scripts/summarize-dataset.mjs <chunk-directory> --recursive
```

The script prints aggregate JSON and never copies chunk content into this
repository.

## Limits

- The 95,360 value is a processed curriculum **chunk** count. It is not a count
  of users, source documents, student records, or public records.
- Upstream PDFs and extraction inputs were not preserved within the audited
  repository, so their count cannot be independently established here.
- Zero parse failures establishes JSON readability only.
- The presence of a quality-score field does not establish score calibration.
- The public fixture file contains 30 records and is not a sample copied from
  the private corpus.
