import { describe, expect, it } from "vitest";

describe("XinUS verified GED research provider", () => {
  const live = process.env.RUN_TAVILY_LIVE_TEST === "1";

  it.skipIf(!live)("accepts the configured server-side Tavily key", async () => {
    const key = process.env.TAVILY_API_KEY;
    expect(key).toBeTruthy();
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query: "GED study skills", max_results: 1, search_depth: "basic" }),
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
