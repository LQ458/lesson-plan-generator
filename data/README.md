# Public data scope

This repository does not include the original curriculum corpus. The complete
data is omitted because of volume, copyright, privacy, and data-governance
constraints.

`sample/curriculum-fixtures.json` contains 30 short examples written for this
repository. Each record is marked `synthetic: true` and released under CC0 1.0.
The fixtures exist only to reproduce the retrieval, context-bounding, streaming,
and source-metadata workflow.

The original project processed 95,360 K–12 curriculum chunks. That figure
describes an aggregate from the private project dataset; it does not mean this
repository contains 95,360 public records. Exact definitions and calculation
limits are in `docs/evidence/dataset-summary.md`.

## Fixture schema

Every record includes:

- `id`
- `subject`
- `grade`
- `topic`
- `content`
- `sourceType`
- `synthetic`
- `license`
