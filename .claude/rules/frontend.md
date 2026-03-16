# Frontend Standards — Totoro

## RTL Support

- App supports Hebrew (RTL). Set `dir` attribute on the `<html>` element based on locale.
- Use logical property utilities only: `ms`/`me`, `ps`/`pe`, `start`/`end`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`.
- Never use `ml`/`mr`, `pl`/`pr`, `left`/`right`, `text-left`/`text-right` for layout spacing or positioning.
- No RTL plugins. Tailwind handles this natively.

## Theming and Dark Mode

- CSS variables for all colors. Define tokens in `globals.css` using `:root` (light) and `.dark` (dark).
- Map tokens to Tailwind via `tailwind.config.js` theme extension. Semantic names: `primary`, `foreground`, `background`, `muted`, `border`, `accent`.
- `next-themes` for system preference detection and theme toggle. No custom dark mode JS.
- Components use semantic classes only (`bg-primary`, `text-foreground`). Never use raw Tailwind colors like `bg-blue-500` directly.
- To swap palette, change CSS variable values only. Components stay untouched.

## Internationalization

- `next-intl` for UI string translations. No other i18n library.
- URL-based routing: `/en/` and `/he/` prefixes. English is the default locale.
- All UI strings go through translation functions. Never hardcode user-facing text in components.
- Translation files: `apps/web/messages/en.json` and `apps/web/messages/he.json`.
- RTL direction is set automatically based on locale via the `dir` attribute on the `<html>` element.
