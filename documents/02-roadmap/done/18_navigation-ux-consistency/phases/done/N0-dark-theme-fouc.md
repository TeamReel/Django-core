# N0 — Dark Theme FOUC Fix

> **Status:** ✅ Klaar
> **Datum:** 2026-03-13

## Probleem

Bij page refresh met dark theme ingesteld verscheen eerst lichte content voordat dark theme CSS toepaste. De inline script in `index.html` zette `data-theme="dark"` correct op `<html>`, maar alle CSS werd pas geladen via Vite JS module imports (`main.tsx`). In de gap tussen HTML parse en CSS load → witte achtergrond.

## Oplossing

### 1. Critical inline `<style>` in `<head>` (na inline theme script)

```html
<style>
  html[data-theme="dark"] { background-color: #0A192F; color: #EDF6FF; }
  html[data-theme="dark"] body { background-color: #0A192F; color: #EDF6FF; }
</style>
```

Kleuren matchen exact de design tokens:
- `#0A192F` = `--color-neutral-900` (Midnight Navy)
- `#EDF6FF` = `--color-neutral-50` (Ice White)

### 2. Dynamic `theme-color` meta update

Het inline script updatet nu ook de `<meta name="theme-color">` tag zodat de browser chrome (address bar, status bar) direct de juiste kleur toont:

```js
var mc = document.querySelector('meta[name="theme-color"]');
if (mc) mc.setAttribute('content', mode === 'dark' ? '#0A192F' : '#3B82F6');
```

## Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `demo/index.html` | Inline `<style>` block voor dark bg/text + dynamic theme-color meta |

## Verificatie

- Build: ✅ 11.04s, 0 errors
