declare module '@django-core/design-system' {
  import type { FC, ReactNode } from 'react';

  export type PageHeaderProps = Record<string, unknown>;
  export const PageHeader: FC<PageHeaderProps>;

  export type PageContentProps = Record<string, unknown>;
  export const PageContent: FC<PageContentProps>;

  export type TableProps = Record<string, unknown>;
  export const Table: FC<TableProps>;

  export type ButtonProps = Record<string, unknown>;
  export const Button: FC<ButtonProps>;

  export type CardProps = Record<string, unknown>;
  export const Card: FC<CardProps>;

  export type BadgeProps = Record<string, unknown>;
  export const Badge: FC<BadgeProps>;

  export type TextProps = Record<string, unknown>;
  export const Text: FC<TextProps>;

  export type SpinnerProps = Record<string, unknown>;
  export const Spinner: FC<SpinnerProps>;

  export type AlertProps = Record<string, unknown>;
  export const Alert: FC<AlertProps>;

  export type ModalProps = Record<string, unknown>;
  export const Modal: FC<ModalProps>;

  export type InputProps = Record<string, unknown>;
  export const Input: FC<InputProps>;

  export type StackProps = Record<string, unknown>;
  export const Stack: FC<StackProps>;

  export interface ThemeProviderProps {
    children?: ReactNode;
  }
  export const ThemeProvider: FC<ThemeProviderProps>;
}

declare module '@django-core/context-switcher' {
  import type { FC, ReactNode } from 'react';

  export interface RouterAdapter {
    push?: (path: string) => void;
    replace?: (path: string) => void;
    getCurrentPath?: () => string;
    navigateTo?: (path: string) => void;
    buildPathForContext?: (
      context: { orgSlug: string; projectSlug?: string | null },
      options?: { preservePath?: boolean; fallbackPath?: string }
    ) => string;
  }

  export interface ContextSwitcherConfig {
    apiBaseUrl: string;
    routerAdapter: RouterAdapter;
    onContextError?: (error: unknown) => void;
  }

  export interface Organisation {
    id: string | number;
    name?: string;
    slug?: string;
  }

  export interface Project {
    id: string | number;
    name?: string;
    organisation_id?: string | number;
  }

  export interface ContextState {
    organisation: Organisation | null;
    project: Project | null;
  }

  export interface ContextSwitcherContextValue {
    context: ContextState;
    organisations: Organisation[];
    projects: Project[];
    loading?: boolean;
    error?: unknown;
    setOrganisation: (organisation: Organisation | null) => void;
    setProject: (project: Project | null) => void;
    switchContext: (organisation: Organisation | null, project?: Project | null) => void;
    switchProject: (project: Project | null) => void;
  }

  export interface ContextSwitcherProviderProps {
    children?: ReactNode;
    config: ContextSwitcherConfig;
  }

  export const ContextSwitcherProvider: FC<ContextSwitcherProviderProps>;
  export function useContextSwitcher(): ContextSwitcherContextValue;
  export const ContextSwitcher: FC<Record<string, unknown>>;
  export const ContextIndicator: FC<Record<string, unknown>>;
  export const OrganisationPicker: FC<Record<string, unknown>>;
  export const ProjectPicker: FC<Record<string, unknown>>;
  export const useDebouncedValue: <T>(value: T, delay: number) => T;
}

declare module '@django-core/page-templates' {
  import type { FC } from 'react';

  export const DefaultEmpty: FC<Record<string, unknown>>;

  export interface ListDetailComponent extends FC<Record<string, unknown>> {
    List: FC<Record<string, unknown>>;
    Detail: FC<Record<string, unknown>>;
  }
  export const ListDetail: ListDetailComponent;

  export interface SettingsComponent extends FC<Record<string, unknown>> {
    Section: FC<Record<string, unknown>>;
  }
  export const Settings: SettingsComponent;
}
