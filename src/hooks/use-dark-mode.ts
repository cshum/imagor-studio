import { useEffect, useState } from 'react';

function useDarkMode(defaultDark: boolean = false) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme
      ? savedTheme === 'dark'
      : defaultDark || window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.body.classList;

    if (isDarkMode) {
      bodyClass.add(className);
      localStorage.setItem('theme', 'dark');
    } else {
      bodyClass.remove(className);
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return {
    isDarkMode,
    toggle: toggleDarkMode,
  };
}

export default useDarkMode;
