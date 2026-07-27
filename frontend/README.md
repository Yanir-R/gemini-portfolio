# AI Portfolio Frontend

React + TypeScript single-page app, built with Vite and deployed to Cloudflare Pages.

## Project structure

```
frontend/
├── public/
│   └── _redirects        # SPA fallback: /* -> /index.html (deep links)
├── src/
│   ├── api/              # apiClient (base URL) + endpoints (relative paths)
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/         # chatService, projectService
│   └── types/
├── .env.development
├── eslint.config.js
└── vite.config.mts
```

## Tech stack

React 19 · TypeScript 5.9 · Vite 8 · react-router 8 · TailwindCSS 3 · Axios

> `react-router-dom` is not published for v8 — import from `react-router`. v8 also sets the Node >= 22.22.0 floor for this project.

## Prerequisites

-   Node.js >= 22.22.0, npm >= 10.8.2

## Development

```bash
npm install
npm run dev     # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `dev` | Vite dev server, port 3000 |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint (flat config) |
| `format` / `format:check` | Prettier |
| `build` | Typecheck, then build — the build fails on a type error |
| `preview` | Serve the built `dist/` |

## Configuration

Both variables are **build-time**: Vite inlines them into the bundle, so changing one requires a rebuild, not a restart.

```bash
# frontend/.env.development
VITE_BACKEND_URL=http://localhost:8000
VITE_SITE_URL=http://localhost:3000
```

| Variable | Effect | Unset falls back to |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Base URL for every API call | deployed backend origin (production) / `localhost:8000` (dev) |
| `VITE_SITE_URL` | Canonical + OpenGraph URLs in `index.html` | deployed frontend origin |

`vite.config.mts` reads these via `loadEnv`, which also picks up process env vars — that is how CI injects them. Endpoint paths in `src/api/endpoints.ts` are **relative**; `apiClient` supplies the host, so there is only one place the backend origin is defined.

### Social preview image

`og:image` / `twitter:image` are intentionally absent, and `twitter:card` is `summary`. Add `public/preview-image.jpg` (1200x630) and restore the tags to enable rich previews — advertising an image URL that 404s renders an empty card.

## Deployment

Pushing to `main` runs `verify` (typecheck, lint, format, build, `npm audit`) and then deploys to Cloudflare Pages via `wrangler pages deploy`. Pull requests run `verify` only.

The Pages project uses **Direct Upload**, not Git integration: GitHub Actions builds with the right build-time env and uploads the result. Do **not** set `VITE_*` variables in the Cloudflare dashboard — with Direct Upload, Cloudflare never builds, so anything set there is silently ignored.

The deploy job is dormant until the `CLOUDFLARE_PAGES_ENABLED` repository variable is `true`.

### SPA routing

`public/_redirects` sends unmatched paths to `index.html`. Without it, a hard refresh on `/projects/reelsensei` returns 404 — this replaces the `try_files` rule the old nginx container used.

## API integration

All calls go through `apiClient` (`src/api/client.ts`), which sets `baseURL` from `VITE_BACKEND_URL`:

| Path | Used by |
| --- | --- |
| `/health` | — |
| `/check-paths` | `chatService.checkFiles` |
| `/chat-with-files` | `chatService.sendMessage` |
| `/api/content/{file}` | About page |
| `/api/projects`, `/api/projects/{slug}` | `projectService` |

The backend rate limits the chat and contact endpoints and returns **429** with a `Retry-After` header; `chatService` surfaces the message through its existing error path.

## Contributing

See the root [README.md](../README.md). CI must pass typecheck, lint, format check, build and audit.
