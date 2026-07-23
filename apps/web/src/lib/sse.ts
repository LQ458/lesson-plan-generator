export interface SourceMetadata {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  sourceType: "synthetic" | "open-license";
  synthetic: boolean;
  license: string;
  score: number;
}

export interface StreamMetadata {
  requestId: string;
  retrieval: {
    mode: "fixture" | "external";
    status: "ok" | "empty";
    contextCharacters: number;
    contextLimit: number;
    contextTruncated: boolean;
  };
  sources: SourceMetadata[];
}

export interface GenerationPayload {
  subject: string;
  grade: string;
  topic: string;
  requirements: string;
  durationMinutes: number;
}

export interface StreamCallbacks {
  onMetadata(metadata: StreamMetadata): void;
  onToken(text: string): void;
  onDone(): void;
}

interface ParsedEvent {
  event: string;
  data: unknown;
}

function parseEventBlock(block: string): ParsedEvent | undefined {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return undefined;
  }

  try {
    return {
      event,
      data: JSON.parse(dataLines.join("\n")) as unknown
    };
  } catch {
    throw new Error("The streaming response contained invalid data.");
  }
}

function messageFromErrorPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "The request could not be completed.";
  }
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") {
    return "The request could not be completed.";
  }
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string"
    ? message
    : "The request could not be completed.";
}

export async function consumeSseResponse(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    throw new Error(messageFromErrorPayload(payload));
  }
  if (!response.body) {
    throw new Error("The streaming response did not include a body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  const handle = (block: string): void => {
    const parsed = parseEventBlock(block);
    if (!parsed) {
      return;
    }

    if (parsed.event === "metadata") {
      callbacks.onMetadata(parsed.data as StreamMetadata);
    } else if (parsed.event === "token") {
      const text = (parsed.data as { text?: unknown }).text;
      if (typeof text === "string") {
        callbacks.onToken(text);
      }
    } else if (parsed.event === "done") {
      completed = true;
      callbacks.onDone();
    } else if (parsed.event === "error") {
      const message = (parsed.data as { message?: unknown }).message;
      throw new Error(
        typeof message === "string"
          ? message
          : "The streamed request could not be completed."
      );
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    buffer = buffer.replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      handle(block);
    }
    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    handle(buffer);
  }
  if (!completed) {
    throw new Error("The streaming response ended before completion.");
  }
}

export async function requestGenerationStream(
  kind: "lesson-plans" | "exercises",
  payload: GenerationPayload,
  callbacks: StreamCallbacks,
  fetchImplementation: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetchImplementation(`/api/${kind}/stream`, {
    method: "POST",
    headers: {
      accept: "text/event-stream",
      "content-type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });
  await consumeSseResponse(response, callbacks);
}
