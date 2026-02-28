import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export const lightColors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  primary: '#007AFF',
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  success: '#34C759',
  successBg: '#E5FEE9',
  warning: '#FF9500',
  danger: '#FF3B30',
  dangerBg: '#FFF0F0',
  primaryBg: '#E5F1FF',
  secondaryBg: '#F2F2F7',
  tabBar: '#FFFFFF',
  tabBarInactive: '#8E8E93',
  white: '#FFFFFF',
};

export const darkColors = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  primary: '#0A84FF',
  border: '#38383A',
  borderLight: '#2C2C2E',
  success: '#32D74B',
  successBg: '#1A3A22',
  warning: '#FF9F0A',
  danger: '#FF453A',
  dangerBg: '#3A1A1A',
  primaryBg: '#1A2A3A',
  secondaryBg: '#2C2C2E',
  tabBar: '#1C1C1E',
  tabBarInactive: '#8E8E93',
  white: '#FFFFFF',
};

export type ThemeColors = typeof lightColors;

interface ThemeContextData {
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('@theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
