import { describe, expect, it } from "vitest";
import { buildEdges, cosineSimilarity, scoreEdge } from "./edge-scoring";
import type { HistoryPage } from "./history";

const page = (id: string, time: number, referringVisitId?: string): HistoryPage => ({
  id,
  title: id,
  url: `https://${id}.example`,
  visits: [{ visitId: `${id}-visit`, visitTime: time, referringVisitId }],
});

describe("cosineSimilarity", () => {
  it("calculates cosine similarity and handles zero vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(Math.SQRT1_2);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });
});

describe("scoreEdge", () => {
  it("detects a referring visit in either direction", () => {
    const parent = page("parent", 1_000);
    const child = page("child", 1_001, "parent-visit");
    expect(scoreEdge(parent, child).reference).toBe(1);
  });

  it("only applies temporal proximity within one session", () => {
    const close = scoreEdge(page("a", 0), page("b", 60_000));
    const distant = scoreEdge(page("a", 0), page("b", 31 * 60_000));
    expect(close.temporal).toBeGreaterThan(0);
    expect(distant.temporal).toBe(0);
  });

  it("keeps reference edges stronger than semantic-only edges", () => {
    const referenced = scoreEdge(page("a", 0), page("b", 1_000, "a-visit"), 0);
    const semanticOnly = scoreEdge(page("a", 0), page("b", 1_000), 1);
    expect(referenced.score).toBeGreaterThan(semanticOnly.score);
  });
});

describe("buildEdges", () => {
  it("retains reference edges even when below the threshold", () => {
    const edges = buildEdges([page("a", 0), page("b", 2 * 60 * 60 * 1000, "a-visit")], new Map(), {
      minScore: 2,
    });
    expect(edges).toHaveLength(1);
    expect(edges[0]?.reference).toBe(1);
  });

  it("keeps only the strongest top-k edges per node", () => {
    const pages = [page("a", 0), page("b", 0), page("c", 0), page("d", 0)];
    const similarities = new Map([
      ["a:b", 1],
      ["a:c", 0.8],
      ["a:d", 0.1],
      ["b:c", 0.9],
      ["b:d", 0.8],
      ["c:d", 0.7],
    ]);
    const edges = buildEdges(pages, similarities, { topK: 1, minScore: 0 });
    const edgesForA = edges.filter((edge) => edge.source === "a");
    expect(edgesForA).toHaveLength(1);
    expect(edgesForA[0]?.target).toBe("b");
  });
});
