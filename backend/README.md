# AI Portfolio Backend

FastAPI service on Google Cloud Run. Answers chat questions grounded in local markdown via the Gemini API, serves project data, and forwards contact emails.

## Project structure

```
backend/
├── docs/
│   ├── profile/       # markdown the chat answers from — published, see warning
│   ├── projects/      # per-project markdown, drives /api/projects and the chat
│   └── templates/     # placeholders for forks; never sent to the model
├── main.py            # FastAPI app, routes, CORS
├── context.py         # assembles + caches the corpus, reports its token cost
├── prompt.py          # the behavioural contract: grounding, voice, boundaries
├── gemini_helper.py   # Gemini call, model fallback, failure copy
├── docs_helper.py     # markdown/PDF loading
├── rate_limit.py      # per-client + global rate limiting
├── tests/             # offline regressions, run in CI
├── evals/             # golden question set, run by hand
├── requirements.txt
└── Dockerfile
```

> **Warning:** `docs/profile/` is **tracked in this public repository** and served over
> `/api/content/`. Everything in it is world-readable on GitHub and is sent to the Gemini API
> on every chat message. Treat it as published: it is for what belongs on a public portfolio,
> and nothing else.

## The context layer

`context.py` and `prompt.py` split one question in two: *what may the chat know*, and *how
may it answer*.

**`context.py`** assembles the corpus from `docs/profile/` and `docs/projects/` and caches it
against file mtimes, so the documents are parsed when they change rather than once per chat
request. It logs the section count and token estimate on load, and warns past a threshold
where sending everything on every request stops being obviously correct. At ~3.6k tokens
against a context window in the hundreds of thousands, retrieval would be solving a problem
this site does not have.

An empty corpus is an error, not a fallback. `docs/templates/` holds placeholders for forks
and is never sent to the model: a deploy with no profile documents makes the chat say it
cannot reach its notes, rather than answering from `[brief story]` in a confident first person.

**`prompt.py`** holds the system instruction — grounding, voice and boundaries. Grounding is
the point of it: the chat answers in Yanir's first person on a page recruiters read, so an
invented employer or date is a false claim attributed to a real person, not just a wrong
answer. The model is told to answer only from the profile, to decline and offer email
follow-up when a question is not covered, and to treat both the corpus and the visitor's
messages as data rather than instructions.

### Changing the prompt or the profile

Both are validated against a golden question set — grounded answers, uncovered questions,
false premises, injection and extraction — which is **kept outside this repository** and run
by hand before shipping a change. `pytest` covers what can be asserted offline and does run
in CI.

> `max_output_tokens` is **not** a length control. On Gemini 3.x it is shared with the model's
> internal thinking tokens, which are spent first, and a budget sized for a short answer is
> consumed before the answer begins — producing a truncated reply on a successful-looking
> response. Answer length is the prompt's job; see the comment in `gemini_helper.py`.

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

Run a **single process**. `rate_limit.py` keeps counters in-process, so N workers multiply the global ceiling by N — see the note in `Dockerfile` before changing the run command, and mirror any change in the Dockerfile the deploy workflow generates.

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
| `ORIGIN_SHARED_SECRET` | The edge Worker's `EDGE_SECRET`. Unset means "do not enforce" |

Localhost origins are always allowed. There is no wildcard origin — `allow_credentials` is enabled, so the allowlist stays explicit.

### The edge secret

In production this service sits behind the Cloudflare Worker in [`edge/`](../edge/README.md), which adds `X-Edge-Auth` to every request it forwards. With `ORIGIN_SHARED_SECRET` set, anything arriving without a matching value gets a **403** — including a direct call to the `run.app` URL, which Cloud Run cannot hide. `/` and `/health` stay reachable without it so health probes keep working. The value is compared after stripping surrounding whitespace, with a constant-time function so it cannot be probed a byte at a time.

Unset means no enforcement, which is what makes a rollout safe: the Worker and the frontend can be moved over before the backend starts requiring the header. Leave it unset locally.

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
| `GET /api/chat/status` | `{"knowledge_ready": bool}` — whether the chat has a corpus |
| `GET /api/content/{file_name}` | Resolved and confined to the profile dir |
| `GET /api/projects` | Listing (content stripped) |
| `GET /api/projects/{slug}` | Single project |
| `POST /chat-with-files` | Rate limited |
| `POST /api/contact` | Rate limited |

There is deliberately no debug or ungrounded-generation endpoint. If you are porting from a
fork that has one: an endpoint returning server filesystem paths and document listings to
anonymous callers belongs behind `/api/chat/status`, which answers the one useful question as
a boolean; and an endpoint that calls Gemini with no corpus is unauthenticated, ungrounded
spend with nothing to attribute it to.

Unexpected errors return an opaque `"Internal server error"`; details are logged server-side with a stack trace rather than reflected to the caller.

### Gemini models

`gemini_helper.py` tries `-latest` aliases first, then falls back down a list. Pinning exact model names is what breaks: a retired name answers 404 and takes chat down with it. Fallback advances on 404/429/5xx read from the SDK's structured `APIError.code`, not substring matching.

## Deployment

Pushing to `main` runs `verify` (compile, import smoke check, `pip-audit`) then deploys to Cloud Run. Pull requests run `verify` only — it needs no cloud credentials.

Authentication uses **Workload Identity Federation**, keyless. There is no service-account JSON key; the OIDC provider is restricted by attribute condition to this repository.

`GEMINI_API_KEY`, `EMAIL_PASSWORD` and `ORIGIN_SHARED_SECRET` are attached from **Secret Manager** with `--set-secrets`, not `--set-env-vars` — env vars are readable in Cloud Run revision metadata by anyone with console/API read on the service.

The container runs as `GCP_RUNTIME_SA`, not as the deploy account: the metadata server mints tokens for whatever the service runs as, so running it as the deployer would hand code execution inside the container the ability to redeploy, push images and read every secret in the project.

The workflow writes its own Dockerfile at deploy time, overwriting the committed `backend/Dockerfile`. Keep the two describing the same container.

There is no Cloud Run domain mapping — `me-west1` does not offer them. The public API hostname is the Cloudflare Worker in [`edge/`](../edge/README.md).

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
