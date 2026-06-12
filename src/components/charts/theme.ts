export interface ChartTheme {
  isDark: boolean;
  colors: {
    primary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    text: string;
    grid: string;
    muted: string;
    series: string[];
  };
  fontSize: {
    small: number;
    medium: number;
    large: number;
  };
}

export const lightTheme: ChartTheme = {
  isDark: false,
  colors: {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#ffffff',
    text: '#1d1d1f',
    grid: 'rgba(0, 0, 0, 0.06)',
    muted: '#86868b',
    series: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#00C7BE'],
  },
  fontSize: {
    small: 12,
    medium: 14,
    large: 16,
  },
};

export const darkTheme: ChartTheme = {
  isDark: true,
  colors: {
    primary: '#0A84FF',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    background: '#2c2c2e',
    text: '#f5f5f7',
    grid: 'rgba(255, 255, 255, 0.08)',
    muted: '#98989d',
    series: ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FF375F', '#36D7B7'],
  },
  fontSize: {
    small: 12,
    medium: 14,
    large: 16,
  },
};

export function getTheme(isDark: boolean): ChartTheme {
  return isDark ? darkTheme : lightTheme;
}
