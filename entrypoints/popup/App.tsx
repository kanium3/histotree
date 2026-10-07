import { useCallback, useEffect, useRef, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { ExternalLink, Moon, RefreshCw, Search, Sun } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";

type HistoryEntry = {
  id: string;
  title?: string;
  url?: string;
  lastVisitTime?: number;
  visitCount?: number;
};

const colors = ["#8b5cf6", "#06b6d4", "#f97316", "#22c55e", "#ec4899", "#eab308"];
const POPUP_ENTRY_LIMIT = 10;

function pageLabel(entry: HistoryEntry) {
  try {
    const url = new URL(entry.url!);
    const title = entry.title?.trim();
    if (title) return title.length > 28 ? `${title.slice(0, 27)}…` : title;
    return url.hostname.replace(/^www\./, "");
  } catch {
    return entry.title ?? entry.url ?? "Unknown page";
  }
}

type AppProps = {
  fullPage?: boolean;
};

function App({ fullPage = false }: AppProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const themeColors = {
    label: isDark ? "#f8f7ff" : "#27272a",
    edge: isDark ? "#4b4964" : "#a1a1aa",
    node: isDark ? "#8b5cf6" : "#6d28d9",
    selectedLabel: isDark ? "#000000" : "#ffffff",
    selectedBackground: isDark ? "#f8fafc" : "#27272a",
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Sigma | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [days, setDays] = useState("7");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startTime = fullPage ? Date.now() - Number(days) * 24 * 60 * 60 * 1000 : undefined;
      const result = await browser.history.search({
        text: fullPage ? query.trim() : "",
        startTime,
        maxResults: 160,
      });
      let historyEntries = result
        .filter((item): item is HistoryEntry => Boolean(item.url && item.id))
        .sort((a, b) => (b.lastVisitTime ?? 0) - (a.lastVisitTime ?? 0));

      if (!fullPage) {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        const currentUrl = activeTab?.url;
        if (currentUrl) {
          const currentEntry =
            historyEntries.find((entry) => entry.url === currentUrl) ??
            (
              await browser.history.search({
                text: currentUrl,
                startTime,
                maxResults: 1,
              })
            ).find((item): item is HistoryEntry => Boolean(item.url && item.id));

          if (currentEntry) {
            historyEntries = [
              currentEntry,
              ...historyEntries.filter((entry) => entry.id !== currentEntry.id),
            ].slice(0, POPUP_ENTRY_LIMIT);
          } else {
            historyEntries = historyEntries.slice(0, POPUP_ENTRY_LIMIT);
          }
        } else {
          historyEntries = historyEntries.slice(0, POPUP_ENTRY_LIMIT);
        }
      }

      setEntries(historyEntries);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "履歴を読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, [days, fullPage, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  useEffect(() => {
    if (!containerRef.current || loading || error || entries.length === 0) return;
    rendererRef.current?.kill();

    const graph = new Graph();
    const pageMap = new Map(entries.map((entry) => [entry.id, entry]));
    const branchFactor = 3;
    const levels = entries.map((_, index) =>
      index === 0
        ? 0
        : Math.floor(Math.log(index * (branchFactor - 1) + 1) / Math.log(branchFactor)),
    );
    const nodesByLevel = new Map<number, number[]>();
    levels.forEach((level, index) => {
      nodesByLevel.set(level, [...(nodesByLevel.get(level) ?? []), index]);
    });

    entries.forEach((entry, index) => {
      const level = levels[index] ?? 0;
      const levelNodes = nodesByLevel.get(level) ?? [index];
      const position = levelNodes.indexOf(index);
      const angle =
        level === 0 ? -Math.PI / 2 : -Math.PI / 2 + (position / levelNodes.length) * Math.PI * 2;
      // Increase the radius with the number of nodes so adjacent nodes keep a clear gap.
      const radius = level === 0 ? 0 : Math.max(level * 4, levelNodes.length * 3);

      graph.addNode(entry.id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: Math.min(16, 7 + (entry.visitCount ?? 1)),
        color: isDark
          ? (colors[index % colors.length] ?? "#8b5cf6")
          : (["#6d28d9", "#0e7490", "#c2410c", "#15803d", "#be185d", "#a16207"][
              index % colors.length
            ] ?? "#6d28d9"),
        label: pageLabel(entry),
      });
    });
    for (let index = 1; index < entries.length; index += 1) {
      const child = entries[index];
      const parentIndex = Math.floor((index - 1) / branchFactor);
      const parent = entries[parentIndex];
      if (child?.url && parent?.url && child.id !== parent.id && pageMap.has(parent.id)) {
        graph.addEdge(parent.id, child.id, { size: 1.4, color: "#635b88" });
      }
    }

    const renderer = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelColor: { color: themeColors.label },
      labelSize: 11,
      labelFont: "Inter, sans-serif",
      defaultEdgeColor: themeColors.edge,
      defaultNodeColor: themeColors.node,
      defaultDrawNodeLabel: (context, data, settings) => {
        if (!data.label) return;
        const font = `${settings.labelWeight} ${settings.labelSize}px ${settings.labelFont}`;
        context.font = font;
        context.textBaseline = "middle";
        const x = data.x + data.size + 4;
        const y = data.y;
        const paddingX = 5;
        const paddingY = 3;
        const textWidth = context.measureText(data.label).width;
        const labelColor =
          typeof data.labelColor === "string" ? data.labelColor : themeColors.label;
        const labelBackground =
          typeof data.labelBackground === "string" ? data.labelBackground : undefined;

        if (labelBackground) {
          context.fillStyle = labelBackground;
          context.beginPath();
          context.roundRect(
            x - paddingX,
            y - settings.labelSize / 2 - paddingY,
            textWidth + paddingX * 2,
            settings.labelSize + paddingY * 2,
            4,
          );
          context.fill();
        }

        context.fillStyle = labelColor;
        context.fillText(data.label, x, y);
      },
      stagePadding: 28,
      labelRenderedSizeThreshold: 9,
    });
    rendererRef.current = renderer;
    renderer.on("clickNode", ({ node }) => setSelected(node));
    renderer.on("clickStage", () => setSelected(null));
    renderer.on("doubleClickNode", ({ node }) => {
      const page = pageMap.get(node);
      if (page?.url) void browser.tabs.create({ url: page.url });
    });
    return () => {
      renderer.kill();
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
      }
    };
  }, [
    entries,
    error,
    isDark,
    loading,
    resolvedTheme,
    themeColors.edge,
    themeColors.label,
    themeColors.node,
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setSetting("nodeReducer", (node, data) => {
      const isSelected = node === selected;
      return {
        ...data,
        hidden: Boolean(
          selected && !isSelected && !renderer.getGraph().neighbors(node).includes(selected),
        ),
        highlighted: isSelected && !isDark,
        ...(!isDark &&
          isSelected && {
            color: themeColors.selectedBackground,
            labelColor: themeColors.selectedLabel,
            labelBackground: themeColors.selectedBackground,
          }),
      };
    });
    renderer.setSetting("edgeReducer", (edge, data) => {
      const graph = renderer.getGraph();
      const [source, target] = graph.extremities(edge);
      return { ...data, hidden: Boolean(selected && source !== selected && target !== selected) };
    });
    renderer.refresh();
  }, [isDark, resolvedTheme, selected, themeColors.selectedBackground, themeColors.selectedLabel]);

  return (
    <main
      className={`flex min-h-screen flex-col gap-4 bg-background p-4 text-foreground sm:gap-5 sm:p-6 ${
        fullPage ? "min-w-[760px] sm:p-[clamp(2.25rem,8vw,6rem)]" : "w-[520px] min-h-[620px]"
      }`}
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">BROWSER MEMORY</p>
          <h1 className="text-2xl font-semibold tracking-tight">Histotree</h1>
        </div>
        <div className="flex items-center gap-2">
          {!fullPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void browser.tabs.create({ url: browser.runtime.getURL("/history.html") })
              }
            >
              別ページで開く
              <ExternalLink data-icon="inline-end" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadHistory()}
            title="更新"
            aria-label="更新"
          >
            <RefreshCw data-icon="inline-start" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title={resolvedTheme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            aria-label={
              resolvedTheme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun data-icon="inline-start" />
            ) : (
              <Moon data-icon="inline-start" />
            )}
          </Button>
        </div>
      </header>
      {fullPage && (
        <section className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="サイトやページを検索"
              aria-label="サイトやページを検索"
            />
          </div>
          <Select value={days} onValueChange={(value) => setDays(value ?? "7")}>
            <SelectTrigger className="h-9 w-[106px]" aria-label="期間">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">今日</SelectItem>
              <SelectItem value="7">7日間</SelectItem>
              <SelectItem value="30">30日間</SelectItem>
              <SelectItem value="365">1年間</SelectItem>
            </SelectContent>
          </Select>
        </section>
      )}
      <Card className="relative flex-1 overflow-hidden border-border/70 bg-card/80">
        <CardHeader className="sr-only">
          <CardTitle>閲覧履歴グラフ</CardTitle>
        </CardHeader>
        <CardContent className="relative min-h-[410px] flex-1 p-0">
          <div ref={containerRef} className="h-full min-h-[410px] w-full" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-card p-6">
              <Alert variant="destructive" className="max-w-md">
                <AlertTitle>履歴を読み込めませんでした</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          {!loading && !error && entries.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card p-6 text-center">
              <p className="font-medium">履歴が見つかりません</p>
              <p className="text-sm text-muted-foreground">
                期間や検索条件を変更してみてください。
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
          <Badge variant="secondary">{entries.length} ページ</Badge>
          <span className="truncate">{selected ?? "最近の閲覧パターン"}</span>
        </CardFooter>
      </Card>
    </main>
  );
}

export default App;
