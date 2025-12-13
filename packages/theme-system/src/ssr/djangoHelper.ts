/**
 * Django template helper for SSR zero-flash initialization.
 *
 * Generates <script> tag with inline theme initialization for Django templates.
 *
 * @module ssr/djangoHelper
 */

import { getThemeInitScript } from './inlineScript';

/**
 * Options for Django theme script generation.
 */
export interface DjangoThemeScriptOptions {
  /**
   * Cookie name to read theme preference from.
   * Default: 'django_theme_pref'
   */
  cookieName?: string;

  /**
   * CSP nonce for inline script security.
   * Required if Content-Security-Policy with script-src is enabled.
   */
  nonce?: string;
}

/**
 * Generate <script> tag for Django templates.
 *
 * Returns complete script tag HTML ready for template rendering.
 * Use Django's |safe filter to prevent escaping.
 *
 * @param options - Configuration options
 * @returns HTML script tag as string
 *
 * @example Django view context
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
 * @example Django template (base.html)
 * ```django
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <meta charset="UTF-8">
 *   {{ theme_init_script|safe }}
 *   <link rel="stylesheet" href="{% static 'css/theme.css' %}">
 * </head>
 * <body>
 *   {% block content %}{% endblock %}
 * </body>
 * </html>
 * ```
 *
 * @example With CSP nonce
 * ```python
 * context = {
 *     'theme_init_script': get_django_theme_script(nonce=request.csp_nonce)
 * }
 * ```
 *
 * @example Custom cookie name
 * ```python
 * context = {
 *     'theme_init_script': get_django_theme_script(cookie_name='my_theme')
 * }
 * ```
 */
export function getDjangoThemeScript(options: DjangoThemeScriptOptions = {}): string {
  const script = getThemeInitScript(options.cookieName);
  const nonceAttr = options.nonce ? ` nonce="${options.nonce}"` : '';

  return `<script${nonceAttr}>${script}</script>`;
}
