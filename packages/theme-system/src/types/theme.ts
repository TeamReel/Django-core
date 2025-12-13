export type ThemeMode = 'light' | 'dark';
export type ThemeBrand = 'default' | string;

export interface ThemeConfiguration {
  mode: ThemeMode;
  brand: ThemeBrand;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ThemeTokenMap {
  // Will be populated in WP02
}
