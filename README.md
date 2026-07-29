# Gemini AI Portfolio

A portfolio site with an AI assistant: React + TypeScript frontend on Cloudflare Pages, FastAPI backend on Google Cloud Run, answers grounded in local markdown via Google's Gemini API.

## Architecture

| Layer | Runs on | Why |
| --- | --- | --- |
| Frontend | Cloudflare Pages (static, global CDN) | It is a static bundle; a container running nginx was doing a CDN's job |
| Backend | Google Cloud Run (scale-to-zero) | Needs Python, calls Gemini, sends SMTP |
| Secrets | Google Secret Manager | Never passed as plaintext Cloud Run env vars |
| CI auth | Workload Identity Federation | Keyless — no service-account JSON exists anywhere |

## Prerequisites

-   Node.js >= 22.22.0 (react-router v8's floor) and npm >= 10.8.2
-   Python 3.12 (3.9 is EOL and cannot install the current requirements)
-   Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
-   Google Cloud project with billing enabled — Cloud Build and Artifact Registry refuse to run without it, even inside the free tier
-   Cloudflare account (free) for frontend hosting

## Quick Start

```bash
git clone https://github.com/Yanir-R/gemini-portfolio.git
cd gemini-portfolio
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run build` | Typechecks first, then builds — a build cannot ship a type error |

### Backend

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Run one process. The rate limiter (below) keeps its counters in-process, so multiple workers multiply the ceiling.

## Configuration

### Frontend

Build-time only — Vite inlines these into the bundle, so changing them requires a rebuild, not a restart.

```bash
# frontend/.env.development
VITE_BACKEND_URL=http://localhost:8000
VITE_SITE_URL=http://localhost:3000
```

`VITE_SITE_URL` fills the canonical and OpenGraph URLs in `index.html`. A **production build fails** if it or `VITE_BACKEND_URL` is missing — a pinned default was previously the only reason production resolved correctly, which hid the injected values being dropped. Never hardcode a domain in the markup.

`VITE_ALLOW_UNCONFIGURED_BUILD=true` opts out and substitutes localhost placeholders. CI `verify` uses it to compile without secrets; never set it on a build you intend to deploy.

### Backend

```bash
# backend/.env  (gitignored — never commit this)
GEMINI_API_KEY=...
EMAIL_ADDRESS=your_gmail@gmail.com
EMAIL_PASSWORD=...            # Gmail App Password, not your account password
YOUR_EMAIL=where_contact_mail_lands@gmail.com

# optional
ALLOWED_ORIGINS=https://your-frontend.example      # comma-separated, added to the CORS allowlist
FRONTEND_PROD_URL=https://your-frontend.example
```

### Rate limiting

`/chat-with-files` and `/api/contact` are unauthenticated and cost money or quota per call, so both a per-client and a global window are enforced. Defaults:

```bash
RATE_LIMIT_CHAT_PER_IP_PER_MINUTE=10
RATE_LIMIT_CHAT_GLOBAL_PER_MINUTE=40
RATE_LIMIT_CONTACT_PER_IP_PER_MINUTE=3
RATE_LIMIT_CONTACT_GLOBAL_PER_MINUTE=15
```

The global window is the cost guard: a per-IP limit alone is defeated by spoofing or a botnet. See `backend/rate_limit.py`.

## Deployment

Both workflows split into a `verify` job (runs on pull requests, needs no cloud credentials) and a `deploy` job gated on `github.event_name == 'push'`. Deploys never run for a pull request — both target fixed service names, so a PR deploy would overwrite the shared environment with unreviewed code.

### Required GitHub configuration

Secrets:

| Name | What |
| --- | --- |
| `GCP_DEV_PROJECT_ID`, `GCP_PROD_PROJECT_ID` | Target GCP project |
| `GCP_SA_EMAIL` | Deploy service account |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource path |
| `EMAIL_ADDRESS`, `YOUR_EMAIL` | SMTP sender / recipient |
| `VITE_BACKEND_URL` | Backend origin baked into the frontend bundle |
| `CLOUDFLARE_API_TOKEN` | Scope: Account → Cloudflare Pages → Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |

Variables:

| Name | What |
| --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | Pages project name |
| `CLOUDFLARE_PAGES_ENABLED` | `true` arms the Pages deploy — set this **last** |
| `SITE_URL` | Public origin for canonical/OG tags |
| `ALLOWED_ORIGINS` | Extra CORS origins for the backend |

There is deliberately **no `GCP_SA_KEY`**. Authentication uses Workload Identity Federation, and the OIDC provider carries an attribute condition restricting it to this repository, so no long-lived JSON key is ever created or stored.

`GEMINI_API_KEY` and `EMAIL_PASSWORD` are **not** GitHub secrets for the backend deploy — they live in Secret Manager and are attached with `--set-secrets`, keeping them out of Cloud Run revision metadata.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /` · `GET /health` | Health check |
| `GET /api/chat/status` | Whether the chat has a corpus to answer from |
| `GET /api/content/{file_name}` | Read a markdown doc (path-confined to the profile dir) |
| `GET /api/projects` · `GET /api/projects/{slug}` | Project data |
| `POST /chat-with-files` | Context-aware chat — rate limited |
| `POST /api/contact` | Contact email — rate limited |

## The context layer

What the chat knows about Yanir, and how it is allowed to answer, lives in three files:

| File | Responsibility |
| --- | --- |
| `backend/docs/profile/` | The source content — published, see the note below |
| `backend/context.py` | Assembles and caches the corpus; reports its token cost |
| `backend/prompt.py` | The behavioural contract: grounding, voice, boundaries |

The corpus is small (~3.6k tokens), so all of it is sent on every request and cached
against file mtimes rather than re-read per call. `context.py` logs the token estimate
on load and warns past a review threshold — the point at which selecting sections per
question would start to be worth building.

**Grounding is the reason the prompt layer exists.** The chat answers in Yanir's first
person on a page recruiters read, so an invented employer or date is a false claim
attributed to a real person. The model is instructed to answer only from the profile,
to decline and offer email follow-up when a question is not covered, and to treat both
the corpus and visitor messages as data rather than instructions.

```
backend/docs/
├── profile/     # markdown the chat answers from — published
├── projects/    # per-project markdown, drives /api/projects and the chat
└── templates/   # placeholders for forks; never sent to the model
```

> **Note:** `backend/docs/profile/` is **tracked in this public repository** and served
> over `/api/content/`. Everything in it is world-readable on GitHub and reaches the
> Gemini API on every chat message. Treat it as published: it is for what belongs on a
> public portfolio, and nothing else.

### Changing what the chat says

Prompt and profile changes are validated against a golden question set — grounded answers,
questions the corpus does not cover, false premises, injection and extraction — which is
kept outside this repository and run by hand before shipping a change. `backend/tests/`
covers what can be asserted offline and runs in CI on every pull request.

## Further reading

-   [Frontend README](frontend/README.md)
-   [Backend README](backend/README.md)
-   [Workflows README](.github/workflows/README.md)

## Contributing

Fork, branch, commit, open a PR. CI runs typecheck, lint, format check, build and a dependency audit on every pull request; all must pass.

## License

[MIT License](LICENSE)
