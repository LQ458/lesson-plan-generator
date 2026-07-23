import { describe, expect, it } from "vitest";
import { allocateLessonMinutes } from "../apps/api/src/generation.js";

describe("lesson timing", () => {
  it.each([15, 16, 30, 45, 90, 180])(
    "allocates exactly %i minutes",
    (duration) => {
      const minutes = allocateLessonMinutes(duration);
      expect(
        minutes.opening + minutes.guided + minutes.practice + minutes.exit
      ).toBe(duration);
      expect(Object.values(minutes).every((value) => value > 0)).toBe(true);
    }
  );
});
