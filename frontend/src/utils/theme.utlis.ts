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

export function setTheme(theme: ThemeMode): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("breathecast-theme", theme);
    const root = window.document.documentElement;
    if (theme === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
}