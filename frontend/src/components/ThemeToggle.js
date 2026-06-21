'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [spinKey, setSpinKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setSpinKey(k => k + 1);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
      aria-label="Cambiar tema"
    >
      <span key={spinKey} className="theme-spin inline-block">
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </span>
    </button>
  );
}
