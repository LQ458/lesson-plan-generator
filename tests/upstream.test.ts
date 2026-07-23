import { describe, expect, it } from "vitest";
import { readRuntimeConfig } from "../apps/api/src/config.js";
import {
  createGenerator,
  GenerationUnavailableError,
  MAX_MODEL_RESPONSE_BYTES
} from "../apps/api/src/generation.js";
import {
  createRetriever,
  MAX_RETRIEVAL_RESPONSE_BYTES,
  RetrievalUnavailableError
} from "../apps/api/src/retrieval.js";

describe("bounded upstream responses", () => {
  it("rejects an oversized retrieval response before using its chunks", async () => {
    const config = readRuntimeConfig({
      RAG_MODE: "external",
      RAG_SERVICE_URL: "https://retrieval.invalid/query"
    });
    const retriever = createRetriever(
      config,
      (async () =>
        new Response(
          JSON.stringify({
            chunks: [
              {
                content: "x".repeat(MAX_RETRIEVAL_RESPONSE_BYTES),
                source: {
                  id: "source",
                  subject: "Science",
                  grade: "7",
                  topic: "Motion",
                  sourceType: "synthetic",
                  synthetic: true,
                  license: "CC0-1.0",
                  score: 1
                }
              }
            ]
          }),
          { status: 200 }
        )) as typeof fetch
    );

    await expect(
      retriever({
        subject: "Science",
        grade: "7",
        topic: "Motion"
      })
    ).rejects.toBeInstanceOf(RetrievalUnavailableError);
  });

  it("rejects an oversized model response before returning content", async () => {
    const config = readRuntimeConfig({
      GENERATION_MODE: "external",
      MODEL_API_URL: "https://model.invalid/generate"
    });
    const generator = createGenerator(
      config,
      (async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "x".repeat(MAX_MODEL_RESPONSE_BYTES)
                }
              }
            ]
          }),
          { status: 200 }
        )) as typeof fetch
    );

    await expect(
      generator({
        kind: "lesson-plan",
        request: {
          subject: "Science",
          grade: "7",
          topic: "Motion",
          requirements: "",
          durationMinutes: 45
        },
        context: {
          text: "",
          includedSourceIds: [],
          includedChunkCount: 0,
          truncated: false,
          characterCount: 0
        },
        sources: []
      })
    ).rejects.toBeInstanceOf(GenerationUnavailableError);
  });

  it("uses mode-neutral wording when external generation has no context", async () => {
    let requestBody = "";
    const config = readRuntimeConfig({
      GENERATION_MODE: "external",
      MODEL_API_URL: "https://model.invalid/generate"
    });
    const generator = createGenerator(
      config,
      (async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = String(init?.body ?? "");
        return Response.json({
          choices: [{ message: { content: "General lesson outline" } }]
        });
      }) as typeof fetch
    );

    await generator({
      kind: "lesson-plan",
      request: {
        subject: "Science",
        grade: "7",
        topic: "Motion",
        requirements: "",
        durationMinutes: 45
      },
      context: {
        text: "",
        includedSourceIds: [],
        includedChunkCount: 0,
        truncated: false,
        characterCount: 0
      },
      sources: []
    });

    const payload = JSON.parse(requestBody) as {
      messages: Array<{ content: string }>;
    };
    expect(payload.messages[1]?.content).toContain(
      "no retrieval context was found"
    );
    expect(payload.messages[1]?.content.toLowerCase()).not.toContain("fixture");
  });
});
