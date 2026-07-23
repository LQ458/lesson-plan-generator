import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.js";
import { readRuntimeConfig } from "../apps/api/src/config.js";
import type { SafeLogger } from "../apps/api/src/logger.js";
import {
  createRetriever,
  RetrievalUnavailableError
} from "../apps/api/src/retrieval.js";

function memoryLogger() {
  const entries: string[] = [];
  const write = (event: string, fields?: Record<string, unknown>) => {
    entries.push(JSON.stringify({ event, ...fields }));
  };
  const logger: SafeLogger = {
    info: write,
    warn: write,
    error: write
  };
  return { entries, logger };
}

function streamedContent(responseText: string): string {
  return Array.from(
    responseText.matchAll(/event: token\ndata: (.+)/g),
    (match) => (JSON.parse(match[1] ?? "{}") as { text?: string }).text ?? ""
  ).join("");
}

function streamedMetadata(responseText: string): Record<string, any> {
  const match = responseText.match(/event: metadata\ndata: (.+)/);
  return JSON.parse(match?.[1] ?? "{}") as Record<string, any>;
}

describe("lesson-planning API", () => {
  it("rejects invalid input with field-level issues", async () => {
    const response = await request(createApp(readRuntimeConfig({})))
      .post("/api/lesson-plans/stream")
      .send({ subject: "", grade: "7", topic: "x", durationMinutes: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INPUT");
    expect(response.body.error.issues.length).toBeGreaterThan(0);
  });

  it("rejects JSON bodies over the configured transport limit", async () => {
    const response = await request(createApp(readRuntimeConfig({})))
      .post("/api/lesson-plans/stream")
      .set("content-type", "application/json")
      .send(
        JSON.stringify({
          subject: "Science",
          grade: "7",
          topic: "Forces and motion",
          requirements: "x".repeat(33 * 1024),
          durationMinutes: 45
        })
      );

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("streams output and source metadata for the fixture workflow", async () => {
    const response = await request(createApp(readRuntimeConfig({})))
      .post("/api/lesson-plans/stream")
      .send({
        subject: "Mathematics",
        grade: "7",
        topic: "Ratios and proportional reasoning",
        requirements: "",
        durationMinutes: 45
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain("event: metadata");
    expect(response.text).toContain("syn-math-07-ratio-01");
    expect(response.text).toContain("event: token");
    expect(response.text).toContain("event: done");
    expect(streamedContent(response.text)).toContain("constant multiplier");
  });

  it("returns an explicit empty-retrieval fallback with no source claim", async () => {
    const response = await request(createApp(readRuntimeConfig({})))
      .post("/api/exercises/stream")
      .send({
        subject: "Mathematics",
        grade: "7",
        topic: "Marine archaeology",
        requirements: "",
        durationMinutes: 45
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('"status":"empty"');
    expect(response.text).toContain('"sources":[]');
    const output = streamedContent(response.text);
    expect(output).toContain("cites no retrieved source");
  });

  it("does not describe an empty external result as a fixture result", async () => {
    const response = await request(
      createApp(
        readRuntimeConfig({
          RAG_MODE: "external",
          RAG_SERVICE_URL: "https://retrieval.invalid/query"
        }),
        {
          retriever: async () => ({
            mode: "external",
            status: "empty",
            chunks: [],
            sources: []
          })
        }
      )
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "Science",
        grade: "7",
        topic: "Forces and motion",
        requirements: "",
        durationMinutes: 45
      });

    expect(response.status).toBe(200);
    expect(streamedContent(response.text).toLowerCase()).not.toContain("fixture");
    expect(streamedContent(response.text)).toContain(
      "No matching retrieval context"
    );
  });

  it("reports only sources from chunks that entered bounded context", async () => {
    const source = {
      id: "shared-source",
      subject: "Science",
      grade: "7",
      topic: "Motion",
      sourceType: "synthetic" as const,
      synthetic: true,
      license: "CC0-1.0",
      score: 1
    };
    const config = readRuntimeConfig({ MAX_CONTEXT_CHARS: "128" });
    const response = await request(
      createApp(config, {
        retriever: async () => ({
          mode: "external",
          status: "ok",
          chunks: [
            { content: "a".repeat(60), source },
            { content: "not included", source: { ...source, score: 0.8 } }
          ],
          sources: [source, { ...source, score: 0.8 }]
        })
      })
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "Science",
        grade: "7",
        topic: "Forces and motion",
        requirements: "",
        durationMinutes: 45
      });

    const metadata = streamedMetadata(response.text);
    expect(metadata.sources).toHaveLength(1);
    expect(metadata.retrieval.contextLimit).toBe(128);
  });

  it("reports empty context when a source header cannot fit the bound", async () => {
    const source = {
      id: "source-with-long-metadata",
      subject: "Science",
      grade: "7",
      topic: "x".repeat(180),
      sourceType: "synthetic" as const,
      synthetic: true,
      license: "CC0-1.0",
      score: 1
    };
    const response = await request(
      createApp(readRuntimeConfig({ MAX_CONTEXT_CHARS: "128" }), {
        retriever: async () => ({
          mode: "external",
          status: "ok",
          chunks: [{ content: "Retrieved content", source }],
          sources: [source]
        })
      })
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "Science",
        grade: "7",
        topic: "Forces and motion",
        requirements: "",
        durationMinutes: 45
      });

    const metadata = streamedMetadata(response.text);
    expect(metadata.retrieval.status).toBe("empty");
    expect(metadata.sources).toEqual([]);
  });

  it("reports external retrieval failure without a fixture-mode disguise", async () => {
    const config = readRuntimeConfig({
      RAG_MODE: "external",
      RAG_SERVICE_URL: "https://retrieval.invalid/query"
    });
    const retriever = createRetriever(
      config,
      (async () => {
        throw new Error("offline");
      }) as typeof fetch
    );
    const response = await request(
      createApp(config, {
        retriever
      })
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "Science",
        grade: "7",
        topic: "Energy flow in ecosystems",
        requirements: "",
        durationMinutes: 45
      });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("RETRIEVAL_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("fixture");
  });

  it("never returns an underlying credential from an error", async () => {
    const credential = "sk-" + "sensitivevalueforatest";
    const response = await request(
      createApp(readRuntimeConfig({}), {
        retriever: async () => {
          throw new Error(`upstream rejected ${credential}`);
        }
      })
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "Science",
        grade: "7",
        topic: "Forces and motion",
        requirements: "",
        durationMinutes: 45
      });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(response.body)).not.toContain(credential);
  });

  it("does not write raw requirements or generated content to logs", async () => {
    const rawRequirement = "private classroom note " + "do-not-log";
    const generatedContent = "generated output " + "do-not-log";
    const { entries, logger } = memoryLogger();
    const response = await request(
      createApp(readRuntimeConfig({}), {
        logger,
        retriever: async () => ({
          mode: "fixture",
          status: "empty",
          chunks: [],
          sources: []
        }),
        generator: async () => generatedContent
      })
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "Science",
        grade: "7",
        topic: "Forces and motion",
        requirements: rawRequirement,
        durationMinutes: 45
      });

    expect(response.status).toBe(200);
    const logs = entries.join("\n");
    expect(logs).not.toContain(rawRequirement);
    expect(logs).not.toContain(generatedContent);
  });

  it("maps a typed retrieval failure to a sanitized service response", async () => {
    const response = await request(
      createApp(readRuntimeConfig({}), {
        retriever: async () => {
          throw new RetrievalUnavailableError();
        }
      })
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "History",
        grade: "7",
        topic: "Trade networks",
        requirements: "",
        durationMinutes: 45
      });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "RETRIEVAL_UNAVAILABLE",
        message: "Curriculum retrieval is temporarily unavailable."
      }
    });
  });

  it("uses one request ID for response and failure/completion logs", async () => {
    const { entries, logger } = memoryLogger();
    const response = await request(
      createApp(readRuntimeConfig({}), {
        logger,
        retriever: async () => {
          throw new RetrievalUnavailableError();
        }
      })
    )
      .post("/api/lesson-plans/stream")
      .send({
        subject: "History",
        grade: "7",
        topic: "Trade networks",
        requirements: "",
        durationMinutes: 45
      });

    const requestId = response.headers["x-request-id"];
    const parsedLogs = entries.map(
      (entry) => JSON.parse(entry) as { event: string; requestId: string }
    );
    expect(requestId).toBeTruthy();
    expect(parsedLogs.map(({ requestId: loggedId }) => loggedId)).toEqual([
      requestId,
      requestId
    ]);
    expect(parsedLogs.map(({ event }) => event)).toEqual([
      "generation.failed",
      "request.completed"
    ]);
  });
});
