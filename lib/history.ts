export type HistoryVisit = {
  visitId: string;
  referringVisitId?: string;
  visitTime?: number;
  transition?: string;
};

export type HistoryPage = {
  id: string;
  title: string;
  url: string;
  lastVisitTime?: number;
  visitCount?: number;
  visits: HistoryVisit[];
};

type HistorySearchItem = {
  id?: string;
  title?: string;
  url?: string;
  lastVisitTime?: number;
  visitCount?: number;
};

type HistoryApi = {
  search: (query: {
    text: string;
    startTime?: number;
    maxResults?: number;
  }) => Promise<HistorySearchItem[]>;
  getVisits: (details: { url: string }) => Promise<HistoryVisit[]>;
};

const DEFAULT_TITLE = "無題のページ";

export function normalizeTitle(title: string | undefined, url: string): string {
  const normalized = title?.normalize("NFKC").replace(/\s+/gu, " ").trim() ?? "";
  if (normalized) return normalized;

  try {
    return new URL(url).hostname.replace(/^www\./u, "") || DEFAULT_TITLE;
  } catch {
    return DEFAULT_TITLE;
  }
}

export async function loadHistoryPages(
  history: HistoryApi,
  options: {
    text?: string;
    startTime?: number;
    maxResults?: number;
  } = {},
): Promise<HistoryPage[]> {
  const results = await history.search({
    text: options.text ?? "",
    startTime: options.startTime,
    maxResults: options.maxResults ?? 160,
  });

  const pages = results.filter((item): item is HistorySearchItem & { id: string; url: string } =>
    Boolean(item.id && item.url),
  );

  return Promise.all(
    pages.map(async (item) => ({
      id: item.id,
      title: normalizeTitle(item.title, item.url),
      url: item.url,
      lastVisitTime: item.lastVisitTime,
      visitCount: item.visitCount,
      visits: await history.getVisits({ url: item.url }),
    })),
  );
}
