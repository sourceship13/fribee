// src/libs/colors.ts
// Centralized color palette for light and dark mode

export const Colors = {
  light: {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#2a3413',
    backgroundSecondary2: '#F2F2F28C',
    surface: '#f5f5f5',
    card: '#f5f5f5',
    chip: '#fff',
    overlayButton: 'rgba(255,255,255,0.5)',
    subscriptionBorder: '#2A2A2A',
    subscriptionBorderGrey: '#8E8E93',

    // Text
    text: '#2A2A2A',
    textSecondary: '#333',
    textTertiary: '#666',
    textPlaceholder: '#aaa',
    subText: '#8E8E93',
    title: '#2A2A2A',
    titleSecondary: '#8E8E93',

    // Navigation
    navButton: '#8E8E93',
    selectedNavButton: '#2A2A2A',
    inactive: '#c4c4c9',
    tabNavigatorText: '#8E8E93',
    tabNavigatorSelectedText: '#2A2A2A',

    // Buttons
    buttonBackground: '#2A2A2A',
    buttonText: '#FFFFFF',
    disabled: '#888',

    // Borders
    border: '#eee',
    borderStrong: '#ddd',

    // Brand Colors
    primary: '#E4760F',
    secondary: '#E5E5EA',
    accent: '#1877F3',
    error: '#e74c3c',

    // Icons
    icon: '#222',
    dealArrows: '#fff',

    // Social
    google: '#EA4335',
    facebook: '#1877F3',
    instagram: '#E1306C',
    apple: '#000',

    // Misc
    lightContactBadge: '#FFE9D4',
    placeholder: '#000',
  },

  dark: {
    // Backgrounds
    background: '#2A2A2A',
    backgroundSecondary: '#D1D1D6',
    backgroundSecondary2: '#F2F2F28C',
    surface: 'rgba(30, 31, 32, 0.95)',
    card: '#222',
    chip: '#222',
    overlayButton: 'rgba(0,0,0,0.5)',
    subscriptionBorder: '#2A2A2A',
    subscriptionBorderGrey: '#71716c',


    // Text
    text: '#d5d5d5',
    textSecondary: '#E0E0E0',
    textTertiary: '#B0B0B0',
    textPlaceholder: '#888',
    subText: '#8E8E93',
    title: '#FFFFFF',
    titleSecondary: '#E5E5EA',

    // Navigation
    navButton: '#8E8E93',
    selectedNavButton: '#FFFFFF',
    inactive: '#3b3b36',
    tabNavigatorText: '#8E8E93',
    tabNavigatorSelectedText: '#FFFFFF',

    // Buttons
    buttonBackground: '#FFFFFF',
    buttonText: '#000000',
    disabled: '#888',

    // Borders
    border: '#333',
    borderStrong: '#444',

    // Brand Colors
    primary: '#1b89f0',
    secondary: '#1a1a15',
    accent: '#BB86FC',
    error: '#CF6679',

    // Icons
    icon: '#fff',
    dealArrows: '#000',

    // Social
    google: '#EA4335',
    facebook: '#1877F3',
    instagram: '#E1306C',
    apple: '#fff',

    // Misc
    lightContactBadge: '#00162b',
    placeholder: '#fff',
  },
};

export function getColors(isDarkMode: boolean) {
  return isDarkMode ? Colors.dark : Colors.light;
}
