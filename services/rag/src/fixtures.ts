import { readFile } from "node:fs/promises";
import type { CurriculumFixture } from "./types.js";

const fixtureUrl = new URL(
  "../../../data/sample/curriculum-fixtures.json",
  import.meta.url
);

let fixtureCache: CurriculumFixture[] | undefined;

export function isCurriculumFixture(value: unknown): value is CurriculumFixture {
  if (!value || typeof value !== "object") {
    return false;
  }

  const fixture = value as Record<string, unknown>;
  return (
    typeof fixture.id === "string" &&
    typeof fixture.subject === "string" &&
    typeof fixture.grade === "string" &&
    typeof fixture.topic === "string" &&
    typeof fixture.content === "string" &&
    (fixture.sourceType === "synthetic" ||
      fixture.sourceType === "open-license") &&
    typeof fixture.synthetic === "boolean" &&
    typeof fixture.license === "string"
  );
}

export async function loadFixtures(): Promise<CurriculumFixture[]> {
  if (fixtureCache) {
    return fixtureCache;
  }

  const parsed: unknown = JSON.parse(await readFile(fixtureUrl, "utf8"));
  if (!Array.isArray(parsed) || !parsed.every(isCurriculumFixture)) {
    throw new Error("Public curriculum fixture file has an invalid schema.");
  }

  fixtureCache = parsed;
  return fixtureCache;
}

export function clearFixtureCache(): void {
  fixtureCache = undefined;
}
