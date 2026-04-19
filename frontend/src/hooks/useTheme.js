import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Check local storage first
    const savedTheme = localStorage.getItem('curalink-theme');
    if (savedTheme) {
      return savedTheme;
    }
    // Fall back to dark as default for this app
    return 'dark';
  });

  useEffect(() => {
    // Add or remove the 'light' string from data-theme attribute
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    // Persist to local storage
    localStorage.setItem('curalink-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
}
