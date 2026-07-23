const endpointByKind = {
  "lesson-plans": "/api/lesson-plans/stream",
  exercises: "/api/exercises/stream"
} as const;

type SupportedKind = keyof typeof endpointByKind;
type RouteContext = { params: Promise<{ kind: string }> };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const MAX_PROXY_BODY_BYTES = 32 * 1024;

class PayloadTooLargeError extends Error {
  constructor() {
    super("Proxy request body exceeds the configured limit.");
    this.name = "PayloadTooLargeError";
  }
}

function configuredTimeout(
  value: string | undefined,
  fallback: number,
  maximum: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : fallback;
}

export function calculateUpstreamTimeout(
  ragTimeout: string | undefined,
  modelTimeout: string | undefined
): number {
  return (
    configuredTimeout(ragTimeout, 8_000, 60_000) +
    configuredTimeout(modelTimeout, 30_000, 120_000) +
    30_000
  );
}

const upstreamTimeoutMs = calculateUpstreamTimeout(
  process.env.RAG_TIMEOUT_MS,
  process.env.MODEL_TIMEOUT_MS
);

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function readBoundedRequestBody(
  request: Request,
  maximumBytes = MAX_PROXY_BODY_BYTES
): Promise<Uint8Array<ArrayBuffer>> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await request.body?.cancel().catch(() => undefined);
    throw new PayloadTooLargeError();
  }
  if (!request.body) {
    return new Uint8Array();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel().catch(() => undefined);
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(new ArrayBuffer(totalBytes));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const { kind } = await context.params;
  if (!(kind in endpointByKind)) {
    return jsonError(404, "NOT_FOUND", "Route not found.");
  }

  let body: Uint8Array<ArrayBuffer>;
  try {
    body = await readBoundedRequestBody(request);
  } catch (error) {
    if (!(error instanceof PayloadTooLargeError)) {
      return jsonError(400, "INVALID_BODY", "Request body could not be read.");
    }
    return jsonError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body exceeds the 32 KB limit."
    );
  }

  const baseUrl = process.env.API_BASE_URL?.trim() || "http://127.0.0.1:3001";
  const upstreamUrl = new URL(
    endpointByKind[kind as SupportedKind],
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  );

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json"
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(upstreamTimeoutMs)
    });

    const headers = new Headers();
    headers.set(
      "content-type",
      upstream.headers.get("content-type") || "application/json; charset=utf-8"
    );
    headers.set("cache-control", "no-cache, no-transform");
    const requestId = upstream.headers.get("x-request-id");
    if (requestId) {
      headers.set("x-request-id", requestId);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch {
    return jsonError(
      502,
      "API_UNAVAILABLE",
      "The lesson-planning API is temporarily unavailable."
    );
  }
}
