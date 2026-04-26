# Project Instructions

## Dev Server Port Discipline

- Always run the Vite dev server on port `5173` only.
- Start it with `--strictPort` so Vite must fail instead of falling back to `5174`, `5175`, or any other port.
- Before starting the dev server, check whether `5173` is already listening.
- If `5173` is already running for this project, kill that listener and restart it on `5173`.
- Do not leave extra Vite dev servers running on fallback ports.

Recommended command:

```bash
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

## childLearn UI Design Soul v3.1

- v3.1 is the active design authority for the whole app. Priority order is `v3.1 > v3.0 > v2.0 > v1.0`.
- Treat every page as a 4-6 year old Chinese preschool number-sense app, primarily for iPad landscape with portrait and phone fallback.
- The visual language must always combine claymorphism, candy-soft color, sticker-cut edges, and breathing motion. Missing any one gene is a regression.
- Before producing UI code, run the self-check against `docs/ui-design-soul-v3.md` and keep `src/programming/UI_SPEC_VERSION.ts` synced to `3.1.0`.
- All UI colors must come from `src/theme/tokens.ts`. Do not introduce raw hex outside `tokens.ts`; use token-backed CSS variables or token imports.
- Use the enumerated token scales in `src/theme/tokens.ts` for spacing, radius, stroke, font size, font weight, line height, duration, springs, and easing.
- Errors in child-facing UI must use warm orange/thinking feedback, never red failure language or crying feedback.
- Keep TopBar controls unified. Do not reintroduce floating Home or speaker controls.
- Home, sound/mute, settings, and back controls must render only through `<AppTopBar>` via `useTopBarConfig`; never use fixed or absolute floating buttons for them.
- Run `npm run guard:topbar` when changing navigation, page shells, or top-level actions.
- Run `npm run ui:soul:check` before handing off UI work.

## Programming Island UI Soul v2.0 Legacy Notes

- Treat the programming scene as a claymorphism, candy-soft, sticker-cut children's product. Correct layout metrics are not enough; the screen must feel soft, touchable, animated, and alive.
- Do not ship a pure-color static scene. Use creamy radial ambience, at least two slow atmosphere elements, grass-like grid cells, layered shadows, inset highlights, and physical press feedback.
- Xiaoman must have idle breathing plus an inverse foot shadow. Obstacles, gems, flags, direction signs, blocks, chips, and CTAs should use rounded 3D material with highlights, shadows, and sticker-style white edging.
- Avoid Material-style `pure fill + 1px gray border + no shadow`, flat gray chips, line-table grids, pure character arrows, flat stones/flags, and opacity-only button feedback.
- Keep the active spec marker in `src/programming/UI_SPEC_VERSION.ts` in sync with the implemented UI constraints.
