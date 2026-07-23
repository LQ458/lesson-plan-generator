import type { RetrievedChunk } from "./types.js";

export const DEFAULT_MAX_CONTEXT_CHARS = 3200;

export interface BoundedContext {
  text: string;
  includedSourceIds: string[];
  includedChunkCount: number;
  truncated: boolean;
  characterCount: number;
}

export function constructBoundedContext(
  chunks: RetrievedChunk[],
  maxCharacters = DEFAULT_MAX_CONTEXT_CHARS
): BoundedContext {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 128) {
    throw new RangeError("maxCharacters must be an integer of at least 128.");
  }

  let text = "";
  const includedSourceIds: string[] = [];
  let truncated = false;

  for (const chunk of chunks) {
    const header = `[${chunk.source.id}] ${chunk.source.subject}, grade ${chunk.source.grade}, ${chunk.source.topic}\n`;
    const separator = text.length === 0 ? "" : "\n\n";
    const available = maxCharacters - text.length - separator.length;

    if (available <= header.length) {
      truncated = true;
      break;
    }

    const entry = `${header}${chunk.content}`;
    const boundedEntry =
      entry.length <= available
        ? entry
        : `${entry.slice(0, Math.max(header.length, available - 1)).trimEnd()}…`;

    text += `${separator}${boundedEntry}`;
    includedSourceIds.push(chunk.source.id);

    if (entry.length > available) {
      truncated = true;
      break;
    }
  }

  return {
    text,
    includedSourceIds,
    includedChunkCount: includedSourceIds.length,
    truncated,
    characterCount: text.length
  };
}
