import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateUpstreamTimeout,
  MAX_PROXY_BODY_BYTES,
  POST
} from "../apps/web/src/app/api/[kind]/stream/route.js";

function streamingRequest(
  chunks: Uint8Array[],
  declaredLength?: number
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (declaredLength !== undefined) {
    headers.set("content-length", String(declaredLength));
  }

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });

  return new Request("http://localhost/api/lesson-plans/stream", {
    method: "POST",
    headers,
    body,
    duplex: "half"
  } as RequestInit & { duplex: "half" });
}

const context = {
  params: Promise.resolve({ kind: "lesson-plans" })
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Next.js streaming proxy", () => {
  it("allows the API retrieval and model timeout budgets plus stream overhead", () => {
    expect(calculateUpstreamTimeout("60000", "120000")).toBe(210_000);
    expect(calculateUpstreamTimeout(undefined, undefined)).toBe(68_000);
  });

  it("rejects a chunked oversized body without Content-Length", async () => {
    const request = streamingRequest([
      new Uint8Array(20 * 1024),
      new Uint8Array(20 * 1024)
    ]);

    const response = await POST(request, context);

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: "PAYLOAD_TOO_LARGE" }
    });
  });

  it("rejects an oversized body even when Content-Length is false", async () => {
    const request = streamingRequest(
      [new Uint8Array(MAX_PROXY_BODY_BYTES + 1)],
      1
    );

    const response = await POST(request, context);

    expect(response.status).toBe(413);
  });

  it("forwards a bounded body and preserves the event stream", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('event: done\ndata: {"requestId":"req"}\n\n', {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "x-request-id": "req"
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const encoded = new TextEncoder().encode(
      JSON.stringify({
        subject: "Science",
        grade: "7",
        topic: "Forces and motion",
        requirements: "",
        durationMinutes: 45
      })
    );

    const response = await POST(streamingRequest([encoded]), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(await response.text()).toContain("event: done");
    expect(fetchMock).toHaveBeenCalledOnce();
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((options.body as Uint8Array).byteLength).toBe(encoded.byteLength);
  });
});
