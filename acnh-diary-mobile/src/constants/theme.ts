/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export const AppColors = {
  paper: '#FFFCF3',
  card: '#FFFFFF',
  paperRaised: '#FFF6E4',
  ink: '#3F2A14',
  inkMuted: '#786D5B',
  line: '#E6D8BC',
  leaf: '#6FAE54',
  leafSoft: '#EAF6DC',
  resident: '#EF6E68',
  residentSoft: '#FFE7E2',
  museum: '#3F94C5',
  museumSoft: '#E6F3FA',
  catalog: '#E7A334',
  catalogSoft: '#FFF1D6',
  camp: '#2FA99F',
  campSoft: '#DDF6F2',
  calendarToday: '#E3F3D8',
  calendarTodayText: '#4D8F58',
  calendarSelected: '#E6F6F0',
  calendarSelectedBorder: '#8CCFBA',
  calendarSelectedText: '#287A63',
  calendarBirthday: '#FDE5EC',
  calendarBirthdayText: '#A13C5A',
  calendarEvent: '#E3F0FA',
  calendarEventText: '#376F99',
  danger: '#C95548',
  background: '#FFFCF3',
  border: '#E6D8BC',
  topBar: '#FFFCF3',
  tabBar: '#FFFDF8',
  tabBarBorder: '#E6D8BC',
  tabBarActive: '#6FAE54',
  tabBarActiveSurface: '#EAF6DC',
  tabBarActiveText: '#3F2A14',
  tabBarInactive: '#786D5B',
  primary: '#6FAE54',
  primaryAction: '#6FAE54',
  primarySurface: '#EAF6DC',
  primarySoft: '#DCEFCB',
  primaryText: '#3F2A14',
  primaryBorder: '#BFD7A7',
} as const;

export const AppStatusColors = {
  leaf: {
    background: AppColors.leafSoft,
    border: '#BFD7A7',
    foreground: AppColors.leaf,
  },
  resident: {
    background: AppColors.residentSoft,
    border: '#F2B6AC',
    foreground: AppColors.resident,
  },
  museum: {
    background: AppColors.museumSoft,
    border: '#A7D3EA',
    foreground: AppColors.museum,
  },
  catalog: {
    background: AppColors.catalogSoft,
    border: '#EBC276',
    foreground: AppColors.catalog,
  },
  camp: {
    background: AppColors.campSoft,
    border: '#9AD8D0',
    foreground: AppColors.camp,
  },
  neutral: {
    background: '#F8F1E4',
    border: AppColors.line,
    foreground: AppColors.inkMuted,
  },
  danger: {
    background: '#F8E5E1',
    border: '#E5A39B',
    foreground: AppColors.danger,
  },
} as const;

export const AppRadii = {
  control: 12,
  card: 16,
  panel: 20,
  pill: 999,
} as const;

export const AppControlSizes = {
  navMin: Platform.select({ ios: 44, android: 48, default: 44 }) ?? 44,
  fieldHeight: 48,
  compactStatus: 32,
  compactStatusMax: 38,
  quickAction: 44,
} as const;

export const AppShadows = {
  card: {
    elevation: 2,
    shadowColor: '#8C6B35',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  floating: {
    elevation: 5,
    shadowColor: '#8C6B35',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
} as const;

export const AppTabBarStyle = {
  backgroundColor: AppColors.tabBar,
  borderTopColor: AppColors.tabBarBorder,
  borderTopWidth: 1,
};

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
