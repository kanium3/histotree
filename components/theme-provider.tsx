import { createContext, useContext, useEffect, useState } from "react";
import { defaultTheme as fallbackTheme, themeItem, type Theme } from "@/lib/settings";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => Promise<void>;
};

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: async () => {},
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = fallbackTheme,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    let active = true;
    themeItem.getValue().then((storedTheme) => {
      if (active) setThemeState(storedTheme ?? defaultTheme);
    });
    const unwatch = themeItem.watch((nextTheme) => {
      setThemeState(nextTheme ?? defaultTheme);
    });

    return () => {
      active = false;
      unwatch();
    };
  }, [defaultTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (nextTheme: "dark" | "light") => {
      root.classList.remove("light", "dark");
      root.classList.add(nextTheme);
      setResolvedTheme(nextTheme);
    };

    if (theme === "system") {
      applyTheme(mediaQuery.matches ? "dark" : "light");
      const handleChange = (event: MediaQueryListEvent) => {
        applyTheme(event.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    applyTheme(theme);
  }, [theme]);

  const value = {
    theme,
    resolvedTheme,
    setTheme: async (nextTheme: Theme) => {
      await themeItem.setValue(nextTheme);
      setThemeState(nextTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
