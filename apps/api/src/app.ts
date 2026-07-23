import { randomUUID } from "node:crypto";
import {
  constructBoundedContext,
  type RetrievalResult
} from "@teachai/rag";
import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type Response
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { RuntimeConfig } from "./config.js";
import {
  createGenerator,
  GenerationUnavailableError,
  type Generator,
  type OutputKind
} from "./generation.js";
import { consoleLogger, type SafeLogger } from "./logger.js";
import {
  createRetriever,
  RetrievalUnavailableError,
  type Retriever
} from "./retrieval.js";
import { validateGenerationRequest } from "./validation.js";

export interface AppDependencies {
  retriever: Retriever;
  generator: Generator;
  logger: SafeLogger;
}

function sendEvent(
  response: Response,
  event: "metadata" | "token" | "done" | "error",
  data: unknown
): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function chunksOf(text: string, size = 96): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

function statusFor(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (error instanceof RetrievalUnavailableError) {
    return {
      status: 502,
      code: "RETRIEVAL_UNAVAILABLE",
      message: "Curriculum retrieval is temporarily unavailable."
    };
  }
  if (error instanceof GenerationUnavailableError) {
    return {
      status: 502,
      code: "GENERATION_UNAVAILABLE",
      message: "Content generation is temporarily unavailable."
    };
  }
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "The request could not be completed."
  };
}

function createHandler(
  kind: OutputKind,
  config: RuntimeConfig,
  dependencies: AppDependencies
) {
  return async (request: Request, response: Response): Promise<void> => {
    const validation = validateGenerationRequest(request.body);
    if (!validation.ok) {
      response.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "The request contains invalid fields.",
          issues: validation.issues
        }
      });
      return;
    }

    const requestId = response.locals.requestId as string;
    try {
      const retrieval: RetrievalResult = await dependencies.retriever({
        subject: validation.value.subject,
        grade: validation.value.grade,
        topic: validation.value.topic,
        limit: 4
      });
      const context = constructBoundedContext(
        retrieval.chunks,
        config.maxContextCharacters
      );
      const includedSources = Array.from(
        new Map(
          retrieval.chunks
            .slice(0, context.includedChunkCount)
            .map(({ source }) => [source.id, source])
        ).values()
      );
      const content = await dependencies.generator({
        kind,
        request: validation.value,
        context,
        sources: includedSources
      });

      response.status(200);
      response.set({
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
        "x-accel-buffering": "no",
        "x-request-id": requestId
      });
      response.flushHeaders();

      sendEvent(response, "metadata", {
        requestId,
        retrieval: {
          mode: retrieval.mode,
          status: includedSources.length > 0 ? "ok" : "empty",
          contextCharacters: context.characterCount,
          contextLimit: config.maxContextCharacters,
          contextTruncated: context.truncated
        },
        sources: includedSources
      });

      let closed = false;
      response.on("close", () => {
        closed = true;
      });

      for (const token of chunksOf(content)) {
        if (closed) {
          return;
        }
        sendEvent(response, "token", { text: token });
        await new Promise<void>((resolve) => setImmediate(resolve));
      }

      if (!closed) {
        sendEvent(response, "done", { requestId });
        response.end();
      }
    } catch (error) {
      const safeError = statusFor(error);
      dependencies.logger.warn("generation.failed", {
        requestId,
        route: kind,
        code: safeError.code
      });

      if (response.headersSent) {
        sendEvent(response, "error", {
          code: safeError.code,
          message: safeError.message
        });
        response.end();
        return;
      }
      response.status(safeError.status).json({
        error: {
          code: safeError.code,
          message: safeError.message
        }
      });
    }
  };
}

export function createApp(
  config: RuntimeConfig,
  overrides: Partial<AppDependencies> = {}
): Express {
  const dependencies: AppDependencies = {
    retriever: overrides.retriever ?? createRetriever(config),
    generator: overrides.generator ?? createGenerator(config),
    logger: overrides.logger ?? consoleLogger
  };

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin is not allowed."));
      }
    })
  );
  app.use(express.json({ limit: "32kb", strict: true }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false
    })
  );

  app.use((request, response, next) => {
    const startedAt = performance.now();
    const requestId = randomUUID();
    response.locals.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    response.on("finish", () => {
      dependencies.logger.info("request.completed", {
        requestId,
        method: request.method,
        route: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt)
      });
    });
    next();
  });

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      retrievalMode: config.ragMode,
      generationMode: config.generationMode
    });
  });

  app.post(
    "/api/lesson-plans/stream",
    createHandler("lesson-plan", config, dependencies)
  );
  app.post(
    "/api/exercises/stream",
    createHandler("exercises", config, dependencies)
  );

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: "NOT_FOUND", message: "Route not found." }
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    const entityTooLarge =
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.too.large";
    response.status(entityTooLarge ? 413 : 400).json({
      error: {
        code: entityTooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
        message: entityTooLarge
          ? "Request body exceeds the 32 KB limit."
          : "Request body must contain valid JSON."
      }
    });
  };
  app.use(errorHandler);

  return app;
}
