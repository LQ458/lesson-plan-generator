import { loadFixtures } from "./fixtures.js";
import type {
  CurriculumFixture,
  RetrievalQuery,
  RetrievalResult,
  RetrievedChunk
} from "./types.js";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with"
]);

function normalize(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function relevanceScore(fixture: CurriculumFixture, topic: string): number {
  const queryTokens = tokens(topic);
  if (queryTokens.length === 0) {
    return 0;
  }

  const topicText = normalize(fixture.topic);
  const searchable = `${topicText} ${normalize(fixture.content)}`;
  const overlap = queryTokens.filter((token) => searchable.includes(token));
  const exactTopicBoost = topicText.includes(normalize(topic)) ? 1 : 0;
  return Number(
    Math.min(1, overlap.length / queryTokens.length + exactTopicBoost * 0.35).toFixed(
      4
    )
  );
}

export async function retrieveFromFixtures(
  query: RetrievalQuery,
  fixtures?: CurriculumFixture[]
): Promise<RetrievalResult> {
  const sourceFixtures = fixtures ?? (await loadFixtures());
  const limit = Math.min(Math.max(query.limit ?? 4, 1), 8);
  const normalizedSubject = normalize(query.subject);
  const normalizedGrade = normalize(query.grade);

  const chunks: RetrievedChunk[] = sourceFixtures
    .filter(
      (fixture) =>
        normalize(fixture.subject) === normalizedSubject &&
        normalize(fixture.grade) === normalizedGrade
    )
    .map((fixture) => ({ fixture, score: relevanceScore(fixture, query.topic) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.fixture.id.localeCompare(right.fixture.id)
    )
    .slice(0, limit)
    .map(({ fixture, score }) => ({
      content: fixture.content,
      source: {
        id: fixture.id,
        subject: fixture.subject,
        grade: fixture.grade,
        topic: fixture.topic,
        sourceType: fixture.sourceType,
        synthetic: fixture.synthetic,
        license: fixture.license,
        score
      }
    }));

  return {
    mode: "fixture",
    status: chunks.length > 0 ? "ok" : "empty",
    chunks,
    sources: chunks.map(({ source }) => source)
  };
}
