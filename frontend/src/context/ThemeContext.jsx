import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: true,
});

export const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage?.getItem('bento-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (_e) {
    /* ignore */
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    try {
      window.localStorage?.setItem('bento-theme', theme);
    } catch (_e) {
      /* ignore */
    }
  }, [theme]);

  // Sync external theme changes (such as from other components or media queries)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event) => {
      if (event.key === 'bento-theme' && (event.newValue === 'dark' || event.newValue === 'light')) {
        setThemeState(event.newValue);
      }
    };

    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleMedia = (e) => {
      const saved = window.localStorage?.getItem('bento-theme');
      if (!saved) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    window.addEventListener('storage', handleStorage);
    media?.addEventListener('change', handleMedia);

    return () => {
      window.removeEventListener('storage', handleStorage);
      media?.removeEventListener('change', handleMedia);
    };
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (next) => {
    if (next === 'dark' || next === 'light') {
      setThemeState(next);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark',
      toggleTheme: () => {},
      setTheme: () => {},
      isDark: true,
    };
  }
  return ctx;
}

export default ThemeContext;
