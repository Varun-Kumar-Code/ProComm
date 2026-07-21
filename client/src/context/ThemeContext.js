import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('procomm-theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
    }
    // Default to light mode
    return false;
  });

  // Initial theme setup to prevent FOUC (Flash of Unstyled Content)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Apply initial theme immediately on mount
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [isDark]); // Include isDark as dependency

  useEffect(() => {
    // Apply theme to document root immediately
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Clear any existing theme classes first
      root.classList.remove('dark');
      
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.style.colorScheme = 'light';
      }
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('procomm-theme', isDark ? 'dark' : 'light');
        
        // Dispatch custom event for components that need to listen
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark } }));
      }
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const setTheme = (theme) => {
    setIsDark(theme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};