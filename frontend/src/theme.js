import { useCallback, useEffect, useState } from 'react';

const KEY = 'kraal-theme';

export function getStoredTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#fff8ec' : '#1a0d06');
}

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute('data-theme') || getStoredTheme()
  );

  useEffect(() => {
    const onChange = (e) => e.detail && setTheme(e.detail);
    window.addEventListener('kraal-theme', onChange);
    return () => window.removeEventListener('kraal-theme', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent('kraal-theme', { detail: next }));
    setTheme(next);
  }, [theme]);

  return [theme, toggle];
}
