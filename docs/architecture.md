# Architecture

## Canonical request path

The repository has one application path and one retrieval package:

1. `apps/web` collects subject, grade, topic, duration, and optional
   requirements.
2. The Next.js route `/api/[kind]/stream` forwards only a JSON body and selected
   content headers to the Express API. It returns the upstream body directly,
   preserving Server-Sent Events rather than buffering the response as JSON.
   The proxy reads request chunks incrementally and stops at 32 KB.
3. `apps/api` validates field lengths and duration, applies a 32 KB body limit
   and rate limit, and selects the configured retrieval mode.
4. `services/rag` filters the public fixtures by subject and grade, ranks by
   topic overlap, and emits source metadata. No topic match produces an explicit
   `empty` status instead of unrelated context.
5. The context builder includes only whole source headers and bounded content,
   never exceeding `MAX_CONTEXT_CHARS`.
6. The configured generator creates a lesson plan or exercises.
7. Express streams `metadata`, `token`, and `done` events. Errors use stable,
   credential-free codes and messages.

## Modes

### Fixture retrieval

`RAG_MODE=fixture` is the default. It reads
`data/sample/curriculum-fixtures.json`, filters exact normalized subject and
grade values, and ranks topic overlap. The deterministic ranking is deliberately
small and auditable. It reproduces the retrieval contract without claiming to
be the original vector index.

### External retrieval

`RAG_MODE=external` requires `RAG_SERVICE_URL`. The API sends:

```json
{
  "subject": "Science",
  "grade": "7",
  "topic": "Energy flow in ecosystems",
  "limit": 4
}
```

The endpoint must return:

```json
{
  "chunks": [
    {
      "content": "Short retrieved content",
      "source": {
        "id": "stable-source-id",
        "subject": "Science",
        "grade": "7",
        "topic": "Energy flow in ecosystems",
        "sourceType": "open-license",
        "synthetic": false,
        "license": "license identifier",
        "score": 0.9
      }
    }
  ]
}
```

Malformed, unavailable, or timed-out external retrieval returns
`RETRIEVAL_UNAVAILABLE`. The service does not silently switch to fixtures.
External retrieval JSON is limited to 512 KiB before parsing.

### Fixture generation

`GENERATION_MODE=fixture` creates deterministic demonstration output. It states
whether context was retrieved and never invents source metadata.

### External generation

`GENERATION_MODE=external` requires `MODEL_API_URL` and accepts an optional
bearer token and model name. The adapter sends an OpenAI-compatible JSON request
with bounded context. An unavailable or malformed service returns
`GENERATION_UNAVAILABLE`; it does not present fixture output as a model result.
Model JSON is limited to 1 MiB before parsing. The web proxy timeout is derived
from the configured retrieval and model budgets plus 30 seconds for stream
overhead.

## Trust and privacy boundaries

- Browser input is limited in the web form and validated again by Express.
- The Next.js proxy does not forward cookies, browser authorization headers, or
  arbitrary upstream headers.
- The API logger records request ID, method, route, status, duration, and stable
  error code only. It does not record request bodies, retrieved content,
  generated content, or credentials.
- External tokens remain server-side.
- Public source records must provide provenance fields and license status.
- Authentication and persistence are outside this reproducible workflow.

## Design lineage

The architecture preserves the established Next.js → Express → retrieval →
streaming generation direction. It consolidates multiple retrieval copies into
`services/rag` and preserves the response stream through the web proxy.
