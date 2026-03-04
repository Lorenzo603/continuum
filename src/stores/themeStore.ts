import { create } from "zustand";

type Theme = "dark" | "light";

const THEME_KEY = "continuum:theme";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  html.classList.add(theme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Always start as "dark" to match server-rendered HTML and avoid hydration mismatch.
  // The inline script in layout.tsx handles the visual class so there's no flash.
  // Call hydrateTheme() in a useEffect to sync React state after mount.
  theme: "dark",

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
    set({ theme: next });
  },
}));

/** Read the persisted theme from localStorage and update the store. Call once in a useEffect. */
export function hydrateTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    useThemeStore.setState({ theme: saved });
  }
}
