/**
 * SSR utilities for zero-flash theme initialization.
 *
 * Provides server-side rendering helpers for Next.js, Django, and other SSR frameworks.
 *
 * @module ssr
 *
 * @example Next.js App Router
 * ```tsx
 * // app/layout.tsx
 * import { ThemeScript, resolveServerTheme } from '@django-core/theme-system/ssr';
 * import { cookies } from 'next/headers';
 *
 * export default function RootLayout({ children }) {
 *   const cookieStore = cookies();
 *   const theme = resolveServerTheme(
 *     cookieStore.get('django_theme_pref')?.value ?? null
 *   );
 *
 *   return (
 *     <html
 *       data-theme={theme?.mode ?? 'light'}
 *       data-brand={theme?.brand ?? 'default'}
 *       suppressHydrationWarning
 *     >
 *       <head>
 *         <ThemeScript />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example Django templates
 * ```python
 * # views.py
 * from django_core.theme import get_django_theme_script
 *
 * def index(request):
 *     context = {
 *         'theme_init_script': get_django_theme_script()
 *     }
 *     return render(request, 'base.html', context)
 * ```
 *
 * ```django
 * {# base.html #}
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   {{ theme_init_script|safe }}
 * </head>
 * <body>
 *   {% block content %}{% endblock %}
 * </body>
 * </html>
 * ```
 */

export { getThemeInitScript } from './inlineScript';
export { ThemeScript } from './ThemeScript';
export type { ThemeScriptProps } from './ThemeScript';
export { getDjangoThemeScript } from './djangoHelper';
export type { DjangoThemeScriptOptions } from './djangoHelper';
export { resolveServerTheme } from './resolveServerTheme';
