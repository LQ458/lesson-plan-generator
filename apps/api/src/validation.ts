export interface GenerationRequest {
  subject: string;
  grade: string;
  topic: string;
  requirements: string;
  durationMinutes: number;
}

export type ValidationResult =
  | { ok: true; value: GenerationRequest }
  | { ok: false; issues: string[] };

function boundedString(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
  issues: string[]
): string {
  if (typeof value !== "string") {
    issues.push(`${field} must be a string.`);
    return "";
  }

  const normalized = value.normalize("NFKC").trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    issues.push(`${field} must contain ${minimum}–${maximum} characters.`);
  }
  return normalized;
}

export function validateGenerationRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, issues: ["Request body must be a JSON object."] };
  }

  const input = body as Record<string, unknown>;
  const issues: string[] = [];
  const subject = boundedString(input.subject, "subject", 2, 80, issues);
  const grade = boundedString(input.grade, "grade", 1, 40, issues);
  const topic = boundedString(input.topic, "topic", 2, 160, issues);
  const requirements =
    input.requirements === undefined
      ? ""
      : boundedString(input.requirements, "requirements", 0, 2_000, issues);

  const requestedDuration =
    input.durationMinutes === undefined ? 45 : input.durationMinutes;
  const durationMinutes =
    typeof requestedDuration === "number" ? requestedDuration : Number.NaN;
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > 180
  ) {
    issues.push("durationMinutes must be an integer between 15 and 180.");
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      subject,
      grade,
      topic,
      requirements,
      durationMinutes
    }
  };
}
