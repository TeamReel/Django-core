declare module '@django-core/design-system' {
  import type { FC, ReactNode } from 'react';

  export type BadgeProps = Record<string, unknown>;
  export const Badge: FC<BadgeProps>;

  export type ButtonProps = Record<string, unknown>;
  export const Button: FC<ButtonProps>;

  export type CardProps = Record<string, unknown>;
  export const Card: FC<CardProps>;

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

declare module '@django-core/api-client' {
  export interface ApiError {
    code: number;
    message: string;
    details?: unknown;
  }

  export interface ApiResponse<T = unknown> {
    data?: T;
    error?: ApiError;
  }

  export interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
  }

  export function createApiClient(config?: Record<string, unknown>): {
    request: <T>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
    get: <T>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
    post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<ApiResponse<T>>;
    put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<ApiResponse<T>>;
    patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<ApiResponse<T>>;
    delete: <T>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
  };

  export function isApiError<T>(response: ApiResponse<T>): response is { error: ApiError };
  export function isApiSuccess<T>(response: ApiResponse<T>): response is { data: T };
}

declare module '@django-core/auth-ui' {
  import type { FC, ReactNode } from 'react';

  export interface User {
    id: string | number;
    email?: string;
    [key: string]: unknown;
  }

  export interface AuthContextValue {
    user: User | null;
    status: 'authenticated' | 'unauthenticated' | 'loading' | 'error';
    isLoading: boolean;
    error: unknown;
    lastVerified: number | null;
    initializeSession: () => Promise<User | null>;
    clearAuth: () => void;
    handleApiError: (response: Response) => Promise<unknown>;
    setUser: (user: User) => void;
  }

  export interface AuthConfig {
    apiBaseUrl: string;
    endpoints: Record<string, string>;
    routes?: Record<string, string>;
  }

  export const AuthProvider: FC<{ children?: ReactNode; config: AuthConfig }>;
  export function useAuth(): AuthContextValue;
  export function useSignIn(): (email: string, password: string) => Promise<void>;
  export function useSignOut(): () => Promise<void>;
}

declare module '@django-core/context-switcher' {
  import type { FC, ReactNode } from 'react';

  export interface Organisation {
    id: string | number;
    name?: string;
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
  }

  export interface ContextSwitcherProviderProps {
    children?: ReactNode;
    config: Record<string, unknown>;
  }

  export const ContextSwitcherProvider: FC<ContextSwitcherProviderProps>;
  export function useContextSwitcher(): ContextSwitcherContextValue;
  export const ContextSwitcher: FC<Record<string, unknown>>;
  export const ContextIndicator: FC<Record<string, unknown>>;
  export const OrganisationPicker: FC<Record<string, unknown>>;
  export const ProjectPicker: FC<Record<string, unknown>>;
  export const useDebouncedValue: <T>(value: T, delay: number) => T;
  export const useKeyboardShortcut: (
    keys: string,
    handler: (event: KeyboardEvent) => void,
    options?: { enabled?: boolean }
  ) => void;
}
