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
