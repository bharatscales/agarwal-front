# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **frontend-only** React + TypeScript ERP application ("Production ERP") for Agaarwal Flexible Packaging. It is served by Vite and deployed to Vercel. The backend (FastAPI) lives in a separate repository and is **not** included here.

### Running the app

- `npm run dev` starts the Vite dev server on `http://localhost:5173`.
- The app expects a backend API at the URL defined by `VITE_API_BASE_URL`. Without a running backend, the login page loads but all API calls will fail — this is expected for frontend-only development.
- See `README.md` for all available npm scripts (`dev`, `build`, `lint`, `preview`).

### Lint and build

- `npm run lint` — ESLint. The codebase has pre-existing lint errors (mostly `@typescript-eslint/no-explicit-any` and `react-hooks` warnings). These are not regressions.
- `npm run build` — runs `tsc -b && vite build`. TypeScript type-checking is part of the build step.

### Testing

- No automated test framework (Jest, Vitest, etc.) is configured. There are no `*.test.*` or `*.spec.*` files.
- Validation is done via lint, build, and manual browser testing.

### Notable caveats

- The `vite.config.ts` allowedHosts includes `app.agaarwalflexiblapackging.com` — if you need to access the dev server from a non-localhost host, you may need to add your hostname there.
- Node.js 18+ is required (the VM comes with v22).
