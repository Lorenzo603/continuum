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
  if (theme === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Default "light" matches server-rendered HTML (no class = light mode).
  // The inline script in layout.tsx adds "dark" class if saved, avoiding flash.
  // Call hydrateTheme() in a useEffect to sync React state after mount.
  theme: "light",

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
