export type HistoryDays = "1" | "7" | "30" | "365";

export type HistotreeSettings = {
  historyDays: HistoryDays;
};

export const SETTINGS_STORAGE_KEY = "histotree-settings";

export const defaultSettings: HistotreeSettings = {
  historyDays: "7",
};

export function loadSettings(): HistotreeSettings {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null",
    ) as Partial<HistotreeSettings> | null;
    const historyDays =
      stored?.historyDays === "1" ||
      stored?.historyDays === "7" ||
      stored?.historyDays === "30" ||
      stored?.historyDays === "365"
        ? stored.historyDays
        : defaultSettings.historyDays;

    return { historyDays };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: HistotreeSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
