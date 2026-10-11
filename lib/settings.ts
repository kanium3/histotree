import { storage } from "#imports";

export type HistoryDays = 1 | 7 | 30 | 365;

export type HistotreeSettings = {
  historyDays: HistoryDays;
};

export type Theme = "dark" | "light" | "system";

export const defaultSettings: HistotreeSettings = {
  historyDays: 7,
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

  return { historyDays };
})();

export function loadSettings(): Promise<HistotreeSettings> {
  return settingsPromise;
}

export async function saveSettings(settings: HistotreeSettings) {
  await settingsItem.setValue(settings);
}
