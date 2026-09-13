import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchMilestoneStats, fetchProgress } from "../src/lib/api";

function stubFetch(status: number, body: unknown) {
  // Typed with the argument we assert on, so `mock.calls[0][0]` is the requested URL.
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("returns the parsed body on success", async () => {
    stubFetch(200, { stats: [], learners: 0 });

    await expect(fetchMilestoneStats()).resolves.toEqual({ stats: [], learners: 0 });
  });

  it("surfaces the API's own message on a 4xx", async () => {
    stubFetch(400, { error: "InvalidAddress", message: "not a valid EVM address" });

    await expect(fetchProgress("nope")).rejects.toThrow("not a valid EVM address");
  });

  it("surfaces the rate limit message rather than a bare status", async () => {
    stubFetch(429, { error: "RateLimited", message: "Too many requests. Try again in 42s." });

    await expect(fetchMilestoneStats()).rejects.toThrow("Too many requests. Try again in 42s.");
  });

  it("falls back to a status message when the body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL) => new Response("<html>502</html>", { status: 502 })),
    );

    await expect(fetchMilestoneStats()).rejects.toThrow("failed with 502");
  });

  it("requests the endpoint for the given address", async () => {
    const fetchMock = stubFetch(200, { learner: "0x1", completedIds: [], events: [] });

    await fetchProgress("0x1111111111111111111111111111111111111111");

    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/api/progress/0x1111111111111111111111111111111111111111",
    );
  });
});
