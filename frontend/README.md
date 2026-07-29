# AI Portfolio Frontend

React + TypeScript single-page app, built with Vite and deployed to Cloudflare Pages.

## Project structure

```
frontend/
├── public/
│   ├── _redirects        # SPA fallback: /* -> /index.html (deep links)
│   └── og-image.png      # link-preview card, generated from tools/og-image.html
├── scripts/
│   └── check-preview-copy.mjs   # CI: preview copy must match the page
├── src/
│   ├── api/              # apiClient (base URL) + endpoints (relative paths)
│   ├── components/
│   ├── constants/        # SITE_COPY — the source of truth for page copy
│   ├── hooks/
│   ├── pages/
│   ├── services/         # chatService, projectService
│   └── types/
├── tools/
│   └── og-image.html     # source for public/og-image.png
├── .env.development
├── eslint.config.js
├── site.config.ts        # public build values: site URL, backend URL, avatar
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

The public build values live in **`site.config.ts`**, committed:

```ts
export const siteConfig = {
    url: 'https://example.com',          // canonical, OpenGraph, sitemap, llms.txt
    backendUrl: 'https://api.example.com', // every API call, and the CSP's connect-src
    avatarUrl: '',                        // optional; empty renders an initial-letter mark
};
```

Forking? Change those three. None is a secret — all three are readable from the deployed site — and committing them is what makes the deploy honest: Vite inlines them at build time, so a value held outside the repository only takes effect on the next build.

Each can be overridden by an environment variable of the same name in upper snake case (`VITE_SITE_URL`, `VITE_BACKEND_URL`, `VITE_AVATAR_URL`), which is what local development uses:

```bash
# frontend/.env.development
VITE_BACKEND_URL=http://localhost:8000
VITE_SITE_URL=http://localhost:3000
```

The environment wins over the file, so CI deliberately sets none of them.

There is **no production fallback** for `url` or `backendUrl`. If both the file and the environment leave one empty, a production build stops rather than shipping a bundle wired to localhost:

```
Error: Production build is missing backendUrl and url.
```

`VITE_ALLOW_UNCONFIGURED_BUILD=true` opts out and substitutes the localhost values, for a deliberately config-less build. Nothing in CI sets it, and it must not be set on a build you intend to ship.

`vite.config.mts` reads the overrides via `loadEnv`, which also picks up process env vars. Endpoint paths in `src/api/endpoints.ts` are **relative**; `apiClient` supplies the host, so there is only one place the backend origin is defined.

### Generated files

`vite.config.mts` emits these into `dist/` rather than committing them, because each needs the absolute site URL or backend origin:

| File | Contents |
| --- | --- |
| `robots.txt` | Answer-time crawlers allowed, training crawlers disallowed, `Sitemap:` line |
| `sitemap.xml` | The four static routes |
| `llms.txt` | Plain-prose summary for assistants that do not run JavaScript |
| `_headers` | Cloudflare Pages response headers, including the CSP that names the backend origin |
| `build-info.json` | The site/backend URLs and commit this deployment was built from |

### Social preview image

`public/og-image.png` (1200x630) backs `og:image` and `twitter:image`, and `twitter:card` is `summary_large_image`. The source is `tools/og-image.html`; regenerate the PNG with the headless-Chrome command in that file's header whenever the headline changes. `npm run check:preview-copy` fails CI if the standfirst duplicated into `index.html` and `tools/og-image.html` drifts from the page's own copy.

## Deployment

Pushing to `main` runs `verify` (typecheck, lint, format, preview-copy check, build, `npm audit`) and then deploys to Cloudflare Pages via `wrangler pages deploy`. Pull requests run `verify` only.

The Pages project uses **Direct Upload**, not Git integration: GitHub Actions builds and uploads `dist/`. Do **not** set `VITE_*` variables in the Cloudflare dashboard — with Direct Upload, Cloudflare never builds, so anything set there is ignored. Change `site.config.ts` and commit instead.

The deploy job is dormant until the `CLOUDFLARE_PAGES_ENABLED` repository variable is `true`.

### SPA routing

`public/_redirects` sends unmatched paths to `index.html`. Without it, a hard refresh on `/projects/reelsensei` returns 404 — this replaces the `try_files` rule the old nginx container used.

## API integration

All calls go through `apiClient` (`src/api/client.ts`), whose `baseURL` is the resolved `backendUrl` — in production the Cloudflare Worker in [`edge/`](../edge/README.md), which forwards to Cloud Run:

| Path | Used by |
| --- | --- |
| `/health` | — |
| `/api/chat/status` | `chatService.checkKnowledge` |
| `/chat-with-files` | `chatService.sendMessage` |
| `/api/content/{file}` | About page |
| `/api/projects`, `/api/projects/{slug}` | `projectService` |

The backend rate limits the chat and contact endpoints and returns **429** with a `Retry-After` header. `chatService` reads that header and tells the visitor how many seconds to wait — which requires the backend to list `Retry-After` in the CORS `expose_headers`, since cross-origin JavaScript cannot read a response header otherwise.

A Gemini-side quota exhaustion is different: it arrives as a normal **200** carrying an in-voice apology as the assistant's reply, because it is not the visitor's request that failed.

Message length (`maxLength=2000`) and history length (last 20 messages) are capped client-side to match the backend's limits, so a normal conversation never comes back as a 422 the visitor cannot act on.

## Contributing

See the root [README.md](../README.md). CI must pass typecheck, lint, format check, build and audit.
