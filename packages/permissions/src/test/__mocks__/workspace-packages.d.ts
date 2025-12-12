declare module '@django-core/api-client' {
  import { Mock } from 'vitest';
  export const fetchWithCSRF: Mock;
}

declare module '@django-core/auth-ui' {
  import { Mock } from 'vitest';
  export const useAuth: Mock;
}

declare module '@django-core/context-switcher' {
  import { Mock } from 'vitest';
  export const useContext: Mock;
}
