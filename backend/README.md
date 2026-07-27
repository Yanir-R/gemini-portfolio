# AI Portfolio Backend

FastAPI service on Google Cloud Run. Answers chat questions grounded in local markdown via the Gemini API, serves project data, and forwards contact emails.

## Project structure

```
backend/
├── docs/
│   ├── private/       # markdown the assistant reads — see warning below
│   ├── projects/      # per-project markdown, drives /api/projects
│   └── templates/
├── main.py            # FastAPI app, routes, CORS
├── gemini_helper.py   # Gemini integration, model fallback
├── docs_helper.py     # markdown/PDF loading
├── rate_limit.py      # per-client + global rate limiting
├── requirements.txt
└── Dockerfile
```

> **Warning:** `docs/private/` is **tracked in this public repository** despite its name. Anything in it is world-readable on GitHub and served over `/api/content/`. Do not put anything there you would not publish.

## Technical stack

FastAPI 0.140 · Python 3.12 · uvicorn · google-genai 2.x · pypdf · Cloud Run

Python 3.9 is EOL and cannot install the current requirements — every dependency fix in the last update required >= 3.10. `PyPDF2` was replaced by `pypdf` (same `PdfReader` API); PyPDF2 is EOL and its advisories are unfixable.

## Local development

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Run a **single process**. `rate_limit.py` keeps counters in-process, so N workers multiply the global ceiling by N — see the note in `Dockerfile` before changing the run command.

## Configuration

```bash
# backend/.env  (gitignored — never commit)
GEMINI_API_KEY=...
EMAIL_ADDRESS=your_gmail@gmail.com
EMAIL_PASSWORD=...        # Gmail App Password, not the account password
YOUR_EMAIL=where_contact_mail_lands@gmail.com
```

Optional:

| Variable | Effect |
| --- | --- |
| `ALLOWED_ORIGINS` | Comma-separated origins added to the CORS allowlist |
| `FRONTEND_PROD_URL`, `FRONTEND_DEV_URL`, `FRONTEND_VITE_URL` | Individual origins |

Localhost origins are always allowed. There is no wildcard origin — `allow_credentials` is enabled, so the allowlist stays explicit.

### Rate limiting

The chat and contact endpoints are unauthenticated and cost quota or money per call. Two windows are enforced:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RATE_LIMIT_CHAT_PER_IP_PER_MINUTE` | 10 | one abuser cannot deny service to others |
| `RATE_LIMIT_CHAT_GLOBAL_PER_MINUTE` | 40 | caps upstream calls regardless of source address |
| `RATE_LIMIT_CONTACT_PER_IP_PER_MINUTE` | 3 | |
| `RATE_LIMIT_CONTACT_GLOBAL_PER_MINUTE` | 15 | |

Setting a limit to `0` disables that window. The global window is the cost guard — a per-IP limit alone is defeated by header spoofing or a botnet. Client identity comes from the **last** `X-Forwarded-For` entry, which is the one Cloud Run's front end appends and the only part a client cannot forge.

Over-limit requests get **429** with a `Retry-After` header.

## API

| Endpoint | Notes |
| --- | --- |
| `GET /` · `GET /health` | Health check |
| `GET /check-paths` | Document availability |
| `GET /api/content/{file_name}` | Resolved and confined to the docs dir |
| `GET /api/projects` | Listing (content stripped) |
| `GET /api/projects/{slug}` | Single project |
| `POST /generate-text` | Rate limited |
| `POST /chat-with-files` | Rate limited |
| `POST /api/contact` | Rate limited |

Unexpected errors return an opaque `"Internal server error"`; details are logged server-side with a stack trace rather than reflected to the caller.

### Gemini models

`gemini_helper.py` tries `-latest` aliases first. Pinned model names were previously used and **all four were retired upstream**, which broke chat entirely with 404s. Fallback advances on 404/429/5xx read from the SDK's structured `APIError.code`, not substring matching.

## Deployment

Pushing to `main` runs `verify` (compile, import smoke check, `pip-audit`) then deploys to Cloud Run. Pull requests run `verify` only — it needs no cloud credentials.

Authentication uses **Workload Identity Federation**, keyless. There is no service-account JSON key; the OIDC provider is restricted by attribute condition to this repository.

`GEMINI_API_KEY` and `EMAIL_PASSWORD` are attached from **Secret Manager** with `--set-secrets`, not `--set-env-vars` — env vars are readable in Cloud Run revision metadata by anyone with console/API read on the service.

```bash
# create/rotate a secret
printf %s "$VALUE" | gcloud secrets create gemini-api-key --data-file=-
printf %s "$VALUE" | gcloud secrets versions add gemini-api-key --data-file=-
```

The deploy service account needs `roles/secretmanager.secretAccessor`.

### Known limitation

`collected_emails.json` is written to container-local disk and is therefore discarded on every scale-to-zero. Contact submissions still reach you by SMTP; that file is a best-effort local log, not a durable record.

## Contributing

See the root [README.md](../README.md).
