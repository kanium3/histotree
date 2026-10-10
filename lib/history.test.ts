import { describe, expect, it, vi } from "vitest";
import { loadHistoryPages, normalizeTitle } from "./history";

describe("normalizeTitle", () => {
  it("normalizes unicode and whitespace", () => {
    expect(normalizeTitle("  Ａ　Ｂ \n C  ", "https://example.com")).toBe("A B C");
  });

  it("falls back to the hostname when title is empty", () => {
    expect(normalizeTitle("   ", "https://www.example.com/path")).toBe("example.com");
  });
});

describe("loadHistoryPages", () => {
  it("loads titles and visits for history results", async () => {
    const history = {
      search: vi.fn().mockResolvedValue([
        { id: "1", url: "https://example.com", title: " Example ", visitCount: 2 },
        { id: "missing-url", title: "ignored" },
      ]),
      getVisits: vi.fn().mockResolvedValue([{ visitId: "visit-1", visitTime: 123 }]),
    };

    await expect(loadHistoryPages(history)).resolves.toEqual([
      {
        id: "1",
        title: "Example",
        url: "https://example.com",
        visitCount: 2,
        visits: [{ visitId: "visit-1", visitTime: 123 }],
      },
    ]);
    expect(history.getVisits).toHaveBeenCalledWith({ url: "https://example.com" });
  });
});
