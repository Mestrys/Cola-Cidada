/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#171D19',
    background: '#F6FBF3',
    backgroundElement: '#EAF0E7',
    backgroundSelected: '#DCE5D8',
    textSecondary: '#556059',
    primary: '#006B26',
    onPrimary: '#FFFFFF',
    primaryContainer: '#C8F0CC',
    danger: '#BA1A1A',
    border: '#C5CCC3',
  },
  dark: {
    text: '#E0E4DE',
    background: '#0F1511',
    backgroundElement: '#1A211C',
    backgroundSelected: '#252D27',
    textSecondary: '#A7B0A9',
    primary: '#6FDC8C',
    onPrimary: '#003914',
    primaryContainer: '#0B3D1B',
    danger: '#FFB4AB',
    border: '#3A443D',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
