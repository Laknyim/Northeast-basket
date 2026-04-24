import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

type Theme = "light" | "dark";
type ColorScheme = typeof Colors.light;

interface ThemeContextType {
  theme: Theme;
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  colors: Colors.light,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    AsyncStorage.getItem("app_theme")
      .then((saved) => {
        if (saved === "dark" || saved === "light") setTheme(saved);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      AsyncStorage.setItem("app_theme", next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      colors: Colors[theme],
      isDark: theme === "dark",
      toggleTheme,
    }),
    [theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
