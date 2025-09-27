import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, Settings } from '../types';

const lightTheme: ThemeColors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  accent: '#FF9500',
  border: '#C6C6C8',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

const darkTheme: ThemeColors = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  accent: '#FF9F0A',
  border: '#38383A',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
};

const solarTheme: ThemeColors = {
  primary: '#B58900',
  secondary: '#CB4B16',
  background: '#FDF6E3',
  surface: '#EEE8D5',
  text: '#657B83',
  textSecondary: '#93A1A1',
  accent: '#D33682',
  border: '#93A1A1',
  success: '#859900',
  warning: '#B58900',
  error: '#DC322F',
};

const monoTheme: ThemeColors = {
  primary: '#666666',
  secondary: '#888888',
  background: '#F8F8F8',
  surface: '#EEEEEE',
  text: '#333333',
  textSecondary: '#999999',
  accent: '#555555',
  border: '#CCCCCC',
  success: '#666666',
  warning: '#777777',
  error: '#444444',
};

const themes = {
  light: lightTheme,
  dark: darkTheme,
  solar: solarTheme,
  mono: monoTheme,
};

interface ThemeContextType {
  theme: ThemeColors;
  themeName: keyof typeof themes;
  setTheme: (theme: keyof typeof themes) => void;
  autoTheme: boolean;
  setAutoTheme: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<keyof typeof themes>('light');
  const [autoTheme, setAutoTheme] = useState(false);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  useEffect(() => {
    if (autoTheme) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setThemeName(colorScheme === 'dark' ? 'dark' : 'light');
      });
      return () => subscription?.remove();
    }
  }, [autoTheme]);

  const loadThemeSettings = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('theme');
      const storedAutoTheme = await AsyncStorage.getItem('autoTheme');

      if (storedTheme && storedTheme in themes) {
        setThemeName(storedTheme as keyof typeof themes);
      }

      if (storedAutoTheme === 'true') {
        setAutoTheme(true);
        const colorScheme = Appearance.getColorScheme();
        setThemeName(colorScheme === 'dark' ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    }
  };

  const setTheme = async (newTheme: keyof typeof themes) => {
    setThemeName(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const setAutoThemeEnabled = async (enabled: boolean) => {
    setAutoTheme(enabled);
    await AsyncStorage.setItem('autoTheme', enabled.toString());

    if (enabled) {
      const colorScheme = Appearance.getColorScheme();
      setThemeName(colorScheme === 'dark' ? 'dark' : 'light');
    }
  };

  const value: ThemeContextType = {
    theme: themes[themeName],
    themeName,
    setTheme,
    autoTheme,
    setAutoTheme: setAutoThemeEnabled,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};