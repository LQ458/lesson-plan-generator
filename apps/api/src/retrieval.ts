import {
  retrieveFromFixtures,
  type RetrievalQuery,
  type RetrievalResult,
  type RetrievedChunk,
  type SourceMetadata
} from "@teachai/rag";
import type { RuntimeConfig } from "./config.js";
import { readJsonResponse } from "./upstream.js";

export type Retriever = (query: RetrievalQuery) => Promise<RetrievalResult>;
export const MAX_RETRIEVAL_RESPONSE_BYTES = 512 * 1024;

export class RetrievalUnavailableError extends Error {
  constructor() {
    super("Retrieval service is unavailable.");
    this.name = "RetrievalUnavailableError";
  }
}

interface ExternalRetrievalPayload {
  chunks?: unknown;
}

function isSourceMetadata(value: unknown): value is SourceMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }
  const source = value as Record<string, unknown>;
  return (
    typeof source.id === "string" &&
    typeof source.subject === "string" &&
    typeof source.grade === "string" &&
    typeof source.topic === "string" &&
    (source.sourceType === "synthetic" ||
      source.sourceType === "open-license") &&
    typeof source.synthetic === "boolean" &&
    typeof source.license === "string" &&
    typeof source.score === "number"
  );
}

function isRetrievedChunk(value: unknown): value is RetrievedChunk {
  if (!value || typeof value !== "object") {
    return false;
  }
  const chunk = value as Record<string, unknown>;
  return (
    typeof chunk.content === "string" &&
    chunk.content.length > 0 &&
    isSourceMetadata(chunk.source)
  );
}

export function createRetriever(
  config: RuntimeConfig,
  fetchImplementation: typeof fetch = fetch
): Retriever {
  if (config.ragMode === "fixture") {
    return (query) => retrieveFromFixtures(query);
  }

  const endpoint = config.ragServiceUrl;
  if (!endpoint) {
    throw new Error("External retrieval endpoint was not configured.");
  }

  return async (query) => {
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json"
      };
      if (config.ragServiceToken) {
        headers.authorization = `Bearer ${config.ragServiceToken}`;
      }

      const response = await fetchImplementation(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject: query.subject,
          grade: query.grade,
          topic: query.topic,
          limit: query.limit ?? 4
        }),
        signal: AbortSignal.timeout(config.ragTimeoutMs)
      });

      if (!response.ok) {
        throw new Error("Non-success retrieval response.");
      }

      const payload = (await readJsonResponse(
        response,
        MAX_RETRIEVAL_RESPONSE_BYTES
      )) as ExternalRetrievalPayload;
      if (!Array.isArray(payload.chunks) || !payload.chunks.every(isRetrievedChunk)) {
        throw new Error("Invalid retrieval response.");
      }

      const chunks = payload.chunks.slice(0, Math.min(query.limit ?? 4, 8));
      return {
        mode: "external",
        status: chunks.length > 0 ? "ok" : "empty",
        chunks,
        sources: chunks.map(({ source }) => source)
      };
    } catch {
      throw new RetrievalUnavailableError();
    }
  };
}
