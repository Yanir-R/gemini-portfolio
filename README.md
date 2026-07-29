# Gemini AI Portfolio

A portfolio site with an AI assistant: React + TypeScript frontend on Cloudflare Pages, FastAPI backend on Google Cloud Run, answers grounded in local markdown via Google's Gemini API.

## Architecture

| Layer | Runs on | Why |
| --- | --- | --- |
| Frontend | Cloudflare Pages (static, global CDN) | It is a static bundle; serving it from a container would be a CDN's job done worse |
| API front door | Cloudflare Worker (`edge/`) | Puts the API behind Cloudflare's rate limiting and bot handling, and adds the shared secret the backend requires |
| Backend | Google Cloud Run (scale-to-zero) | Needs Python, calls Gemini, sends SMTP |
| Secrets | Google Secret Manager | Never passed as plaintext Cloud Run env vars |
| CI auth | Workload Identity Federation | Keyless — no service-account JSON exists anywhere |

The browser never calls Cloud Run directly: it calls `api.<domain>`, the Worker
forwards to the `run.app` URL with a shared secret, and the backend rejects
anything arriving without it. See [edge/README.md](edge/README.md).

## Prerequisites

-   Node.js >= 22.22.0 (react-router v8's floor) and npm >= 10.8.2
-   Python 3.12 (3.9 is EOL and cannot install the current requirements)
-   Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
-   Google Cloud project with billing enabled — Cloud Build and Artifact Registry refuse to run without it, even inside the free tier
-   Cloudflare account (free) for the frontend (Pages) and the API front door (Workers)

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

The public build values are committed in **`frontend/site.config.ts`**: the site
URL, the backend URL and an optional avatar URL. Forking? Change those three.

None of them is a secret — all three are readable from the deployed site — and
committing them is what keeps the deploy honest: Vite inlines them at build
time, so a value held in a repository variable takes effect only on the next
build, and changing one after a deploy does nothing at all.

For local work, an environment variable of the same name overrides each:

```bash
# frontend/.env.development
VITE_BACKEND_URL=http://localhost:8000
VITE_SITE_URL=http://localhost:3000
```

A **production build fails** if `url` or `backendUrl` resolves to empty, rather
than shipping a bundle pointing at localhost. `VITE_ALLOW_UNCONFIGURED_BUILD=true`
opts out for a deliberately config-less build; never set it on a build you
intend to deploy. Never hardcode a domain in the markup — `index.html` uses a
`%VITE_SITE_URL%` placeholder that the build substitutes.

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
ORIGIN_SHARED_SECRET=...   # must match the edge Worker's EDGE_SECRET
```

`ORIGIN_SHARED_SECRET` unset means "do not enforce", which is what lets the
Worker be rolled out before the backend starts requiring it. Once set, every
request that does not carry the matching header gets a 403 — including a direct
call to the `run.app` URL. Leave it unset for local development.

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
| `GCP_DEV_PROJECT_ID` | Target GCP project |
| `GCP_SA_EMAIL` | Deploy service account |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource path |
| `EMAIL_ADDRESS`, `YOUR_EMAIL` | SMTP sender / recipient |
| `CLOUDFLARE_API_TOKEN` | Scope: Account → Cloudflare Pages → Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |

Variables:

| Name | What |
| --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | Pages project name |
| `CLOUDFLARE_PAGES_ENABLED` | `true` arms the Pages deploy — set this **last** |
| `GCP_RUNTIME_SA` | Identity the Cloud Run container runs as, distinct from the deploy account |
| `ALLOWED_ORIGINS` | Extra CORS origins for the backend |

The frontend's URLs are not in this list: they live in `frontend/site.config.ts`
for the reason given above.

There is deliberately **no `GCP_SA_KEY`**. Authentication uses Workload Identity Federation, and the OIDC provider carries an attribute condition restricting it to this repository, so no long-lived JSON key is ever created or stored.

`GEMINI_API_KEY`, `EMAIL_PASSWORD` and `ORIGIN_SHARED_SECRET` are **not** GitHub secrets for the backend deploy — they live in Secret Manager and are attached with `--set-secrets`, keeping them out of Cloud Run revision metadata.

The Worker in `edge/` is deployed by hand (`npx wrangler deploy`), not by CI, and
its `EDGE_SECRET` lives only in Cloudflare.

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
-   [Edge Worker README](edge/README.md)
-   [Workflows README](.github/workflows/README.md)

## Contributing

Fork, branch, commit, open a PR. CI runs typecheck, lint, format check, build and a dependency audit on every pull request; all must pass.

## License

[MIT License](LICENSE)
