export class UpstreamResponseTooLargeError extends Error {
  constructor() {
    super("Upstream response exceeded the configured byte limit.");
    this.name = "UpstreamResponseTooLargeError";
  }
}

export async function readJsonResponse(
  response: Response,
  maximumBytes: number
): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new UpstreamResponseTooLargeError();
  }
  if (!response.body) {
    throw new Error("Upstream response body is empty.");
  }

  const reader = response.body.getReader();
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
      throw new UpstreamResponseTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
}
