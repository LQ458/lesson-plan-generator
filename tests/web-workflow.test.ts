import { describe, expect, it, vi } from "vitest";
import {
  consumeSseResponse,
  requestGenerationStream,
  type StreamMetadata
} from "../apps/web/src/lib/sse.js";

function streamedResponse(parts: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(encoder.encode(part));
        }
        controller.close();
      }
    }),
    {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    }
  );
}

describe("frontend streaming workflow", () => {
  it("preserves metadata and tokens across arbitrary stream boundaries", async () => {
    const metadata: StreamMetadata[] = [];
    let content = "";
    let completed = false;
    const response = streamedResponse([
      'event: metadata\ndata: {"requestId":"req-1","retrieval":{"mode":"fixture","status":"ok","contextCharacters":120,"contextLimit":3200,"contextTruncated":false},"sources":[{"id":"syn-math-07-ratio-01","subject":"Mathematics","grade":"7","topic":"Ratios","sourceType":"synthetic","synthetic":true,"license":"CC0-1.0","score":1}]}\n',
      '\nevent: token\ndata: {"text":"First "}\n\nevent: to',
      'ken\ndata: {"text":"second"}\n\nevent: done\ndata: {"requestId":"req-1"}\n\n'
    ]);

    await consumeSseResponse(response, {
      onMetadata(value) {
        metadata.push(value);
      },
      onToken(value) {
        content += value;
      },
      onDone() {
        completed = true;
      }
    });

    expect(metadata[0]?.sources[0]?.id).toBe("syn-math-07-ratio-01");
    expect(content).toBe("First second");
    expect(completed).toBe(true);
  });

  it("posts the complete lesson-plan request to the same-origin proxy", async () => {
    const fetchMock = vi.fn(async () =>
      streamedResponse([
        'event: metadata\ndata: {"requestId":"req-2","retrieval":{"mode":"fixture","status":"empty","contextCharacters":0,"contextLimit":3200,"contextTruncated":false},"sources":[]}\n\n',
        'event: token\ndata: {"text":"Fallback"}\n\n',
        'event: done\ndata: {"requestId":"req-2"}\n\n'
      ])
    );
    let content = "";

    await requestGenerationStream(
      "lesson-plans",
      {
        subject: "Mathematics",
        grade: "7",
        topic: "Ratios",
        requirements: "",
        durationMinutes: 45
      },
      {
        onMetadata() {},
        onToken(token) {
          content += token;
        },
        onDone() {}
      },
      fetchMock as typeof fetch
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/lesson-plans/stream");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(content).toBe("Fallback");
  });

  it("surfaces a sanitized non-stream error", async () => {
    const response = Response.json(
      {
        error: {
          code: "API_UNAVAILABLE",
          message: "The lesson-planning API is temporarily unavailable."
        }
      },
      { status: 502 }
    );

    await expect(
      consumeSseResponse(response, {
        onMetadata() {},
        onToken() {},
        onDone() {}
      })
    ).rejects.toThrow("temporarily unavailable");
  });

  it("rejects a stream that ends without a completion event", async () => {
    const response = streamedResponse([
      'event: token\ndata: {"text":"partial"}\n\n'
    ]);

    await expect(
      consumeSseResponse(response, {
        onMetadata() {},
        onToken() {},
        onDone() {}
      })
    ).rejects.toThrow("ended before completion");
  });
});
