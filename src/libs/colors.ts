// src/libs/colors.ts
// Centralized color palette for light and dark mode

export const Colors = {
  light: {
    background: '#E6E9EF',
    surface: '#f5f5f5',
    title: `#2A2A2A`,
    titleSecondary: `#8E8E93`,
    buttonBackground: `#2A2A2A`,
    buttonText: `#FFFFFF`,
    primary: '#DE541E',
    secondary: '#4ECDC4',
    accent: '#1877F3',
    error: '#e74c3c',
    text: '#111',
    dealArrows: '#fff',
    textSecondary: '#333',
    textTertiary: '#666',
    textPlaceholder: '#aaa',
    border: '#eee',
    borderStrong: '#ddd',
    card: '#f5f5f5',
    chip: '#fff',
    icon: '#222',
    google: '#EA4335',
    facebook: '#1877F3',
    instagram: '#E1306C',
    apple:'red',
    disabled: '#888',
    placeholder: '#000'
  },
  dark: {
    background: '#2A2A2A' ,
    surface: 'rgba(30, 31, 32, 0.95)',
    title: `#FFFFFF`,
    titleSecondary: `#E5E5EA`,
    buttonBackground: `#FFFFFF`,
    buttonText: `#000000`,
    primary: '#DE541E',
    secondary: '#4ECDC4',
    accent: '#BB86FC',
    error: '#CF6679',
    text: '#fff',
    dealArrows: '#000',
    textSecondary: '#E0E0E0',
    textTertiary: '#B0B0B0',
    textPlaceholder: '#888',
    border: '#222',
    borderStrong: '#444',
    card: '#222',
    chip: '#222',
    icon: '#fff',
    google: '#EA4335',
    facebook: '#1877F3',
    instagram: '#E1306C',
    apple: '#fff',
    disabled: '#888',
    placeholder: '#fff'
  },
};

export function getColors(isDarkMode: boolean) {
  return isDarkMode ? Colors.dark : Colors.light;
}
