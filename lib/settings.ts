import { storage } from "#imports";

export type HistoryDays = 1 | 7 | 30 | 365;
export type HistoryLimit = 160 | 300 | 500 | 700 | 1000;

export type HistotreeSettings = {
  historyDays: HistoryDays;
  historyLimit: HistoryLimit;
};

export type Theme = "dark" | "light" | "system";

export const defaultSettings: HistotreeSettings = {
  historyDays: 7,
  historyLimit: 160,
};

export const defaultTheme: Theme = "system";

const settingsItem = storage.defineItem<HistotreeSettings>("local:histotree-settings", {
  fallback: defaultSettings,
});

export const themeItem = storage.defineItem<Theme>("local:vite-ui-theme", {});

const settingsPromise = (async (): Promise<HistotreeSettings> => {
  const stored = await settingsItem.getValue();
  const historyDays =
    stored.historyDays === 1 ||
    stored.historyDays === 7 ||
    stored.historyDays === 30 ||
    stored.historyDays === 365
      ? stored.historyDays
      : defaultSettings.historyDays;
  const historyLimit =
    stored.historyLimit === 160 ||
    stored.historyLimit === 300 ||
    stored.historyLimit === 500 ||
    stored.historyLimit === 700 ||
    stored.historyLimit === 1000
      ? stored.historyLimit
      : defaultSettings.historyLimit;

  return { historyDays, historyLimit };
})();

export function loadSettings(): Promise<HistotreeSettings> {
  return settingsPromise;
}

export async function saveSettings(settings: HistotreeSettings) {
  await settingsItem.setValue(settings);
}
