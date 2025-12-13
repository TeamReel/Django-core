// ThemeStorage interface placeholder - will be implemented in WP04
export interface ThemeStorage {
  load: () => Promise<{ mode: string; brand: string } | null>;
  save: (theme: { mode: string; brand: string }) => Promise<void>;
}
