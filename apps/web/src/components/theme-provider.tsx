"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function isClient(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () =>
      ((isClient()
        ? localStorage.getItem(storageKey)
        : null) as Theme | null) || defaultTheme
  );

  useEffect(() => {
    if (!isClient()) return;

    // biome-ignore lint/suspicious/noExplicitAny: DOM API requires any type
    const root = (globalThis as any).document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      // biome-ignore lint/suspicious/noExplicitAny: DOM API requires any type
      const systemTheme = (globalThis as any).matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      if (isClient()) {
        localStorage.setItem(storageKey, newTheme);
      }
      setThemeState(newTheme);
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

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
