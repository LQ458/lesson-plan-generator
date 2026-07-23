# Engineering evaluation

Evaluation in this repository measures whether the reproducible workflow
behaves as documented. It does not estimate student learning effects or compare
model quality.

## Automated checks

| Check | Expected property |
| --- | --- |
| Fixture schema and count | 20–50 valid, uniquely identified records |
| Retrieval filtering | Subject and grade are exact normalized filters |
| Empty retrieval | Unrelated topics return `status: empty` and no sources |
| Context bound | Context never exceeds the configured character limit |
| Source metadata | Every included chunk exposes provenance and license fields |
| Input validation | Missing, oversized, or invalid fields return 400 |
| Payload limit | JSON bodies over 32 KB return 413 |
| Proxy stream limit | Missing or false `Content-Length` cannot bypass 32 KB |
| Retrieval failure | External failure returns an explicit 502 |
| Upstream response limit | Oversized retrieval/model JSON is rejected |
| Credential safety | Underlying error text is never returned to the client |
| Logging boundary | Request requirements and generated content are absent |
| Frontend workflow | Metadata and tokens survive arbitrary stream boundaries |
| Production smoke test | API TypeScript and Next.js production builds succeed |

Run the checks with:

```bash
pnpm test
pnpm build
```

External model, database, and retrieval-service integration tests are optional
and are not part of credential-free continuous integration.

## Interpretation limits

Fixture retrieval is deterministic lexical ranking over 30 synthetic records.
It validates filtering, context construction, provenance, failure behavior, and
stream transport. It does not reproduce the relevance distribution or latency
of the original 95,360-chunk vector index.

The deterministic generator demonstrates the application contract. It should
not be used to infer the accuracy, classroom value, or performance of any
external model.

Classroom evidence is reported separately in
`docs/evidence/classroom-evaluation-summary.md`; it is not used as an automated
software acceptance metric.
