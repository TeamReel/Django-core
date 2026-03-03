/**
 * Type stub for @django-core/context-switcher
 * TODO: Remove when F03 package is available
 */

declare module '@django-core/context-switcher' {
  export interface F03ContextValue {
    orgId: string | undefined;
    projectId: string | undefined;
    organisationName?: string;
  }

  export function useContext(): F03ContextValue;
}
