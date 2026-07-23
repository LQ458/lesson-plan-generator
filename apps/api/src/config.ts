import {
  DEFAULT_MAX_CONTEXT_CHARS,
  type RetrievalMode
} from "@teachai/rag";

export type GenerationMode = "fixture" | "external";

export interface RuntimeConfig {
  port: number;
  allowedOrigins: string[];
  ragMode: RetrievalMode;
  ragServiceUrl: string | undefined;
  ragServiceToken: string | undefined;
  ragTimeoutMs: number;
  maxContextCharacters: number;
  generationMode: GenerationMode;
  modelApiUrl: string | undefined;
  modelApiKey: string | undefined;
  modelName: string | undefined;
  modelTimeoutMs: number;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function integer(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Configuration integer must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function mode<T extends string>(
  value: string | undefined,
  fallback: T,
  allowed: readonly T[]
): T {
  const selected = (value?.trim().toLowerCase() || fallback) as T;
  if (!allowed.includes(selected)) {
    throw new Error(`Unsupported configuration mode: ${selected}`);
  }
  return selected;
}

export function readRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env
): RuntimeConfig {
  const ragMode = mode<RetrievalMode>(env.RAG_MODE, "fixture", [
    "fixture",
    "external"
  ]);
  const generationMode = mode<GenerationMode>(
    env.GENERATION_MODE,
    "fixture",
    ["fixture", "external"]
  );
  const ragServiceUrl = optional(env.RAG_SERVICE_URL);
  const modelApiUrl = optional(env.MODEL_API_URL);

  if (ragMode === "external" && !ragServiceUrl) {
    throw new Error("RAG_SERVICE_URL is required when RAG_MODE=external.");
  }
  if (generationMode === "external" && !modelApiUrl) {
    throw new Error("MODEL_API_URL is required when GENERATION_MODE=external.");
  }

  return {
    port: integer(env.PORT, 3001, 1, 65_535),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ragMode,
    ragServiceUrl,
    ragServiceToken: optional(env.RAG_SERVICE_TOKEN),
    ragTimeoutMs: integer(env.RAG_TIMEOUT_MS, 8_000, 100, 60_000),
    maxContextCharacters: integer(
      env.MAX_CONTEXT_CHARS,
      DEFAULT_MAX_CONTEXT_CHARS,
      128,
      12_000
    ),
    generationMode,
    modelApiUrl,
    modelApiKey: optional(env.MODEL_API_KEY),
    modelName: optional(env.MODEL_NAME),
    modelTimeoutMs: integer(env.MODEL_TIMEOUT_MS, 30_000, 100, 120_000)
  };
}
