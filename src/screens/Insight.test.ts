import { describe, expect, it } from "vitest";
import insightSource from "./Insight.tsx?raw";

describe("Insight screen", () => {
  it("never writes storage: no save path is reachable from the screen (demo stays in memory)", () => {
    expect(insightSource).not.toMatch(/saveRound|localStorage|setItem/);
    expect(insightSource).toMatch(/import\.meta\.env\.DEV/);
  });
});
