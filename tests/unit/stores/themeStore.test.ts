/**
 * Unit tests for src/stores/themeStore.ts — toggle/persist behavior.
 * localStorage is stubbed; document/applyTheme is absent in node, which the
 * store tolerates (applyTheme no-ops when `document` is undefined).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useThemeStore, hydrateTheme } from "@/stores/themeStore";

function makeLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    _dump: () => ({ ...store }),
  };
}

describe("useThemeStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeLocalStorage());
    useThemeStore.setState({ theme: "light" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toggles light -> dark and persists the choice", () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("continuum:theme")).toBe("dark");
  });

  it("toggles dark -> light and persists the choice", () => {
    useThemeStore.setState({ theme: "dark" });
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(localStorage.getItem("continuum:theme")).toBe("light");
  });

  it("hydrateTheme restores a persisted theme", () => {
    localStorage.setItem("continuum:theme", "dark");
    hydrateTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("hydrateTheme ignores an invalid persisted value", () => {
    localStorage.setItem("continuum:theme", "neon");
    useThemeStore.setState({ theme: "light" });
    hydrateTheme();
    expect(useThemeStore.getState().theme).toBe("light");
  });
});
