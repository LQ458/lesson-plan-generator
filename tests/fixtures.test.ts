import { describe, expect, it } from "vitest";
import {
  isCurriculumFixture,
  loadFixtures
} from "@teachai/rag";

describe("public curriculum fixtures", () => {
  it("contains between 20 and 50 schema-valid synthetic records", async () => {
    const fixtures = await loadFixtures();

    expect(fixtures.length).toBeGreaterThanOrEqual(20);
    expect(fixtures.length).toBeLessThanOrEqual(50);
    expect(fixtures.every(isCurriculumFixture)).toBe(true);
    expect(fixtures.every((fixture) => fixture.synthetic)).toBe(true);
    expect(fixtures.every((fixture) => fixture.license === "CC0-1.0")).toBe(
      true
    );
  });

  it("uses unique, stable fixture identifiers", async () => {
    const fixtures = await loadFixtures();
    const ids = fixtures.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^syn-[a-z0-9-]+$/.test(id))).toBe(true);
  });
});
