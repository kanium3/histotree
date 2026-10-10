import type { HistoryPage } from "./history";

export type EdgeScore = {
  source: string;
  target: string;
  score: number;
  reference: number;
  temporal: number;
  semantic: number;
};

export type EdgeScoringOptions = {
  referenceWeight?: number;
  temporalWeight?: number;
  semanticWeight?: number;
  sessionGapMs?: number;
  temporalHalfLifeMs?: number;
  minScore?: number;
  topK?: number;
};

const defaults = {
  referenceWeight: 1,
  temporalWeight: 0.25,
  semanticWeight: 0.6,
  sessionGapMs: 30 * 60 * 1000,
  temporalHalfLifeMs: 5 * 60 * 1000,
  minScore: 0.35,
  topK: 5,
} satisfies Required<EdgeScoringOptions>;

function pairKey(left: string, right: string): [string, string] {
  return left < right ? [left, right] : [right, left];
}

function closestVisitGap(left: HistoryPage, right: HistoryPage): number | undefined {
  const leftTimes = left.visits
    .map((visit) => visit.visitTime)
    .filter((time): time is number => time !== undefined);
  const rightTimes = right.visits
    .map((visit) => visit.visitTime)
    .filter((time): time is number => time !== undefined);
  if (leftTimes.length === 0 || rightTimes.length === 0) return undefined;

  let closest = Number.POSITIVE_INFINITY;
  for (const leftTime of leftTimes) {
    for (const rightTime of rightTimes) {
      closest = Math.min(closest, Math.abs(leftTime - rightTime));
    }
  }
  return closest;
}

function hasReferenceRelationship(left: HistoryPage, right: HistoryPage): boolean {
  const leftVisitIds = new Set(left.visits.map((visit) => visit.visitId));
  const rightVisitIds = new Set(right.visits.map((visit) => visit.visitId));
  return (
    left.visits.some(
      (visit) => visit.referringVisitId && rightVisitIds.has(visit.referringVisitId),
    ) ||
    right.visits.some((visit) => visit.referringVisitId && leftVisitIds.has(visit.referringVisitId))
  );
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue ** 2;
    rightMagnitude += rightValue ** 2;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

export function scoreEdge(
  left: HistoryPage,
  right: HistoryPage,
  semanticSimilarity = 0,
  options: EdgeScoringOptions = {},
): EdgeScore {
  const settings = { ...defaults, ...options };
  const [source, target] = pairKey(left.id, right.id);
  const reference = hasReferenceRelationship(left, right) ? 1 : 0;
  const gap = closestVisitGap(left, right);
  const temporal =
    gap === undefined || gap > settings.sessionGapMs
      ? 0
      : Math.exp((-Math.log(2) * gap) / settings.temporalHalfLifeMs);
  const semantic = Math.max(0, Math.min(1, semanticSimilarity));

  return {
    source,
    target,
    reference,
    temporal,
    semantic,
    score:
      reference * settings.referenceWeight +
      temporal * settings.temporalWeight +
      semantic * settings.semanticWeight,
  };
}

export function buildEdges(
  pages: HistoryPage[],
  similarities: Map<string, number> = new Map(),
  options: EdgeScoringOptions = {},
): EdgeScore[] {
  const settings = { ...defaults, ...options };
  const candidates: EdgeScore[] = [];

  for (let leftIndex = 0; leftIndex < pages.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < pages.length; rightIndex += 1) {
      const left = pages[leftIndex];
      const right = pages[rightIndex];
      if (!left || !right) continue;
      const [source, target] = pairKey(left.id, right.id);
      const edge = scoreEdge(left, right, similarities.get(`${source}:${target}`), settings);
      if (edge.reference || edge.score >= settings.minScore) candidates.push(edge);
    }
  }

  if (settings.topK <= 0) return candidates;
  const byNode = new Map<string, EdgeScore[]>();
  for (const edge of candidates) {
    byNode.set(edge.source, [...(byNode.get(edge.source) ?? []), edge]);
    byNode.set(edge.target, [...(byNode.get(edge.target) ?? []), edge]);
  }
  const retained = new Set<EdgeScore>();
  for (const edges of byNode.values()) {
    for (const edge of edges
      .sort((left, right) => right.score - left.score)
      .slice(0, settings.topK)) {
      retained.add(edge);
    }
  }
  return [...retained].sort((left, right) => right.score - left.score);
}
