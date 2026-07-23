import { describe, expect, it } from "vitest";
import {
  constructBoundedContext,
  retrieveFromFixtures,
  type RetrievedChunk
} from "@teachai/rag";

describe("fixture retrieval", () => {
  it("filters on subject and grade before ranking the topic", async () => {
    const result = await retrieveFromFixtures({
      subject: "Mathematics",
      grade: "7",
      topic: "ratios and proportional reasoning"
    });

    expect(result.status).toBe("ok");
    expect(result.sources[0]?.id).toBe("syn-math-07-ratio-01");
    expect(
      result.sources.every(
        (source) =>
          source.subject === "Mathematics" && source.grade === "7"
      )
    ).toBe(true);
  });

  it("returns an explicit empty result instead of unrelated context", async () => {
    const result = await retrieveFromFixtures({
      subject: "Mathematics",
      grade: "7",
      topic: "marine archaeology"
    });

    expect(result).toMatchObject({
      mode: "fixture",
      status: "empty",
      chunks: [],
      sources: []
    });
  });

  it("returns source metadata for every retrieved chunk", async () => {
    const result = await retrieveFromFixtures({
      subject: "Science",
      grade: "7",
      topic: "energy flow in ecosystems"
    });

    expect(result.sources).toHaveLength(result.chunks.length);
    expect(result.sources[0]).toMatchObject({
      id: "syn-science-07-ecosystem-01",
      sourceType: "synthetic",
      synthetic: true,
      license: "CC0-1.0"
    });
  });
});

describe("bounded context construction", () => {
  it("never exceeds the configured character limit", () => {
    const chunks: RetrievedChunk[] = Array.from({ length: 5 }, (_, index) => ({
      content: "context ".repeat(100),
      source: {
        id: `syn-test-${index}`,
        subject: "Science",
        grade: "7",
        topic: "Test topic",
        sourceType: "synthetic",
        synthetic: true,
        license: "CC0-1.0",
        score: 1
      }
    }));

    const result = constructBoundedContext(chunks, 256);

    expect(result.characterCount).toBeLessThanOrEqual(256);
    expect(result.text.length).toBe(result.characterCount);
    expect(result.truncated).toBe(true);
    expect(result.includedSourceIds).toEqual(["syn-test-0"]);
    expect(result.includedChunkCount).toBe(1);
  });
});
