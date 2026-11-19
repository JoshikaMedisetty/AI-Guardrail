import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(t: Theme) {
  const el = document.documentElement;
  el.classList.toggle("dark", t === "dark");
  el.classList.toggle("light", t === "light");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const t: Theme = saved === "light" ? "light" : "dark";
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("theme", next);
    window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-lg transition hover:scale-110"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export function useThemeValue(): Theme {
  const [t, setT] = useState<Theme>("dark");
  useEffect(() => {
    setT(localStorage.getItem("theme") === "light" ? "light" : "dark");
    const h = (e: Event) => setT((e as CustomEvent<Theme>).detail);
    window.addEventListener("themechange", h);
    return () => window.removeEventListener("themechange", h);
  }, []);
  return t;
}

/** Applies the saved theme on every page without showing a button. */
export function ThemeInit() {
  useEffect(() => {
    applyTheme(localStorage.getItem("theme") === "light" ? "light" : "dark");
  }, []);
  return null;
}
