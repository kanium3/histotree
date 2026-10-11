import { use, useState } from "react";
import { ExternalLink, Moon, Settings, Sun } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { defaultSettings, loadSettings, saveSettings, type HistoryDays } from "@/lib/settings";

const historyDayOptions: { value: HistoryDays; label: string }[] = [
  { value: 1, label: "今日" },
  { value: 7, label: "7日間" },
  { value: 30, label: "30日間" },
  { value: 365, label: "1年間" },
];

function Options() {
  const { theme, setTheme } = useTheme();
  const settings = use(loadSettings());
  const [historyDays, setHistoryDays] = useState<HistoryDays>(settings.historyDays);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const updateHistoryDays = async (value: string | null) => {
    const nextHistoryDays = Number(value);
    if (
      nextHistoryDays !== 1 &&
      nextHistoryDays !== 7 &&
      nextHistoryDays !== 30 &&
      nextHistoryDays !== 365
    ) {
      return;
    }
    const nextSettings = { historyDays: nextHistoryDays as HistoryDays };
    setHistoryDays(nextSettings.historyDays);
    await saveSettings(nextSettings);
  };

  const resetSettings = async () => {
    setHistoryDays(defaultSettings.historyDays);
    await saveSettings(defaultSettings);
    await setTheme("system");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground">
              <Settings className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-semibold tracking-tight">設定</h1>
              <p className="text-sm text-muted-foreground">
                表示方法と履歴グラフの初期値を変更できます。
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              void browser.tabs.create({ url: browser.runtime.getURL("/history.html") })
            }
          >
            履歴グラフを開く
            <ExternalLink data-icon="inline-end" />
          </Button>
        </header>

        <section className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>表示</CardTitle>
              <CardDescription>全体で使う外観を選択します。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <label htmlFor="theme" className="text-sm font-medium">
                  テーマ
                </label>
                <Select value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
                  <SelectTrigger id="theme" className="w-full sm:w-[260px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      <span className="flex items-center gap-2">
                        <Settings data-icon="inline-start" />
                        システム設定に合わせる
                      </span>
                    </SelectItem>
                    <SelectItem value="light">
                      <span className="flex items-center gap-2">
                        <Sun data-icon="inline-start" />
                        ライト
                      </span>
                    </SelectItem>
                    <SelectItem value="dark">
                      <span className="flex items-center gap-2">
                        <Moon data-icon="inline-start" />
                        ダーク
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>履歴グラフ</CardTitle>
              <CardDescription>履歴グラフを開いたときに表示する期間の初期値です。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <label htmlFor="history-days" className="text-sm font-medium">
                  初期表示期間
                </label>
                <Select value={String(historyDays)} onValueChange={updateHistoryDays}>
                  <SelectTrigger id="history-days" className="w-full sm:w-[260px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {historyDayOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-dashed">
          <CardFooter className="flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">設定は変更時に自動保存されます。</p>
            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <AlertDialogTrigger render={<Button variant="ghost" />}>
                設定を初期化
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>設定を初期化しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    テーマと履歴グラフの表示期間を初期値に戻します。この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetSettings();
                      setResetDialogOpen(false);
                    }}
                  >
                    初期化する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export default Options;
