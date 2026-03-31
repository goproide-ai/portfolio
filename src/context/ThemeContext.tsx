"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "black" | "white";
interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; isWhite: boolean }

const ThemeContext = createContext<ThemeCtx>({ theme: "black", setTheme: () => {}, isWhite: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("black");

  useEffect(() => {
    const saved = localStorage.getItem("portfolio-theme") as Theme | null;
    if (saved === "white" || saved === "black") setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("portfolio-theme", theme);
    document.documentElement.classList.toggle("theme-white", theme === "white");
    document.documentElement.classList.toggle("theme-black", theme === "black");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isWhite: theme === "white" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
