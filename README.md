# Chinese K-12 AI Lesson-Planning Platform

A lesson-planning and curriculum-retrieval system developed alongside classroom
fieldwork in Bijie, Guizhou.

The platform accepts a subject, grade, and topic; retrieves relevant curriculum
context; applies a strict context bound; and streams a lesson plan or exercise
set with source metadata. The default local path uses original synthetic
fixtures and requires no production credential.

## What is included

- Next.js web interface with a streaming-preserving server proxy
- Node/Express API with input validation, payload limits, rate limiting, and
  safe structured logs
- One canonical RAG package for fixture and optional external retrieval
- Bounded context construction and explicit empty-retrieval behavior
- Lesson-plan and exercise workflows
- Source metadata in every successful retrieval response
- Fixture, RAG, API, failure-path, logging, and frontend stream tests
- Continuous integration and public-repository safety checks

Authentication is intentionally not part of this reproducible path. The
historical authentication implementation depended on deployment-specific
services and was not required to demonstrate curriculum retrieval.

## Architecture

```text
Browser form
  → Next.js same-origin streaming proxy
    → Express POST /api/{lesson-plans|exercises}/stream
      → fixture retrieval (default) or external retrieval (opt-in)
        → bounded context
          → deterministic fixture generator (default) or external model (opt-in)
            → Server-Sent Events: metadata → tokens → done
```

Fixture mode uses deterministic lexical ranking so that the complete workflow
can be tested without a vector database. The original private project used
semantic chunking and vector retrieval at full scale. See
[`docs/architecture.md`](docs/architecture.md) for the component and trust
boundaries.

## Local quick start

Requirements: Node.js 22 or newer and pnpm 9 or newer. Continuous integration
uses the package-manager version pinned in `package.json`.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. The pre-filled example — Mathematics, grade 7,
“Ratios and proportional reasoning” — has a matching public fixture. The API
runs on `127.0.0.1:3001`.

The default settings are:

```text
RAG_MODE=fixture
GENERATION_MODE=fixture
```

No key or external database is needed. When either mode is set to `external`,
its endpoint must be supplied through environment variables. An unavailable
external service returns an explicit error; the API does not present a fallback
as an external result.

## Environment configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Express API port | `3001` |
| `API_BASE_URL` | Server-only URL used by the Next.js proxy | `http://127.0.0.1:3001` |
| `ALLOWED_ORIGINS` | Comma-separated direct API origins | `http://localhost:3000` |
| `RAG_MODE` | `fixture` or `external` retrieval | `fixture` |
| `RAG_SERVICE_URL` | External retrieval endpoint | unset |
| `RAG_SERVICE_TOKEN` | Optional external retrieval bearer token | unset |
| `RAG_TIMEOUT_MS` | External retrieval timeout | `8000` |
| `MAX_CONTEXT_CHARS` | Upper bound for retrieved context | `3200` |
| `GENERATION_MODE` | `fixture` or `external` generation | `fixture` |
| `MODEL_API_URL` | OpenAI-compatible JSON generation endpoint | unset |
| `MODEL_API_KEY` | Optional model bearer token | unset |
| `MODEL_NAME` | Model identifier expected by the endpoint | unset |
| `MODEL_TIMEOUT_MS` | External model timeout | `30000` |

The external retrieval contract is documented in
[`docs/architecture.md`](docs/architecture.md).

This reproducible application has no authentication surface. Do not expose an
external, credential-backed model through it without an upstream authentication,
quota, and abuse-control layer.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit:public
pnpm audit:dependencies
```

`pnpm test` covers fixture count and schema, subject/grade filtering, empty
retrieval, context length, source metadata, invalid input, retrieval failure,
error sanitization, logging boundaries, and the frontend streaming workflow.

## Scale

- 1,556 JSON source files
- 1,556 files parsed and 0 parse failures
- 95,360 K–12 curriculum chunks
- 240,594,877 aggregate JSON bytes (229.45 MiB)
- 14,394 chunks with an explicit numeric quality score (15.09%)

The private processing pipeline included OCR cleanup, duplicate filtering,
quality scoring, semantic chunking, vector retrieval, and streaming generation.
The 95,360 figure describes processed chunks in the original project dataset;
it is not a user count, document count, or public dataset size. Definitions and
reproduction details are in
[`docs/evidence/dataset-summary.md`](docs/evidence/dataset-summary.md).

## Classroom context

The preserved classroom comparison contains 100 raw records across two classes
of 50. Subject-specific usable observations were 97 for Chinese, 99 for
mathematics, and 98 for English; 97 records were complete across all three
subjects. The groups were classes.

A broader reach of approximately 150 students across classes is
project-lead-confirmed; an independent artifact supporting that exact total was
not preserved in the reviewed materials. Class, teacher, review-time, test
difficulty, and administration differences limit causal interpretation, and
subject results were not uniform. See
[`docs/evidence/classroom-evaluation-summary.md`](docs/evidence/classroom-evaluation-summary.md).

## Data, privacy, and licensing

The complete curriculum corpus, textbook text, OCR output, vector indexes,
student-level records, prompts, generated account content, and deployment data
are not included. Public fixtures are original synthetic records released under
CC0 1.0. Source code is available under the MIT License.

The public fixture mode reproduces the engineering workflow, not the original
corpus or a production deployment. No learning-effect, accuracy, latency, or
teacher-time improvement is claimed.
