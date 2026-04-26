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

## Programming Island UI Soul v2.0

- Treat the programming scene as a claymorphism, candy-soft, sticker-cut children's product. Correct layout metrics are not enough; the screen must feel soft, touchable, animated, and alive.
- Do not ship a pure-color static scene. Use creamy radial ambience, at least two slow atmosphere elements, grass-like grid cells, layered shadows, inset highlights, and physical press feedback.
- Xiaoman must have idle breathing plus an inverse foot shadow. Obstacles, gems, flags, direction signs, blocks, chips, and CTAs should use rounded 3D material with highlights, shadows, and sticker-style white edging.
- Avoid Material-style `pure fill + 1px gray border + no shadow`, flat gray chips, line-table grids, pure character arrows, flat stones/flags, and opacity-only button feedback.
- Keep the active spec marker in `src/programming/UI_SPEC_VERSION.ts` in sync with the implemented UI constraints.
