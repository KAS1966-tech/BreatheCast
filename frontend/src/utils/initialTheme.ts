import type { ThemeMode } from "../hooks/types/theme.type";

export function getInitialTheme(): ThemeMode {
    if (typeof window === "undefined") return "day";
    const stored = window.localStorage.getItem("breathecast-theme");
    if (stored === "day" || stored === "dark") return stored;
    const prefersDark = window.matchMedia?.(
        "(prefers-color-scheme: dark)",
    ).matches;
    return prefersDark ? "dark" : "day";
}