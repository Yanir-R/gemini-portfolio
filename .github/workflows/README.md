# GitHub Actions Workflows

Two workflows, each split into `verify` and `deploy`.

| Workflow | Triggers on | Jobs |
| --- | --- | --- |
| `frontend-deploy.yml` | changes under `frontend/**` | `verify` → `deploy-pages` (Cloudflare) → `deploy` (legacy Cloud Run) |
| `backend-deploy.yml` | changes under `backend/**` | `verify` → `deploy` (Cloud Run) |

## Why verify and deploy are separate

`verify` runs on **pull requests and pushes**, needs no cloud credentials, and deploys nothing:

-   frontend: `npm ci`, typecheck, lint, format check, build, `npm audit --audit-level=high`
-   backend: `pip install`, `compileall`, import smoke check, `pip-audit`

`deploy` is gated on `github.event_name == 'push'` and `needs: verify`. Both deploy jobs target **fixed service names with no per-PR isolation**, so running them for a pull request would overwrite the shared environment with unreviewed code, and two concurrent PRs would race for the same service.

The audits run in CI, so a newly disclosed advisory fails the build rather than sitting unnoticed.

## Required configuration

### Secrets

| Name | Value |
| --- | --- |
| `GCP_DEV_PROJECT_ID`, `GCP_PROD_PROJECT_ID` | Target GCP project ID |
| `GCP_REGION` | `me-west1` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource path |
| `GCP_SA_EMAIL` | Deploy service account address |
| `VITE_BACKEND_URL` | Backend origin compiled into the frontend bundle |
| `EMAIL_ADDRESS`, `YOUR_EMAIL` | SMTP sender / recipient |
| `CLOUDFLARE_API_TOKEN` | Scope: Account → Cloudflare Pages → Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `PROD_DOMAIN`, `DEV_DOMAIN` | Custom domains, if mapped |

### Variables

| Name | Value |
| --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | Pages project name |
| `CLOUDFLARE_PAGES_ENABLED` | `true` arms the Pages deploy — set **last** |
| `SITE_URL` | Public origin for canonical/OG tags |
| `ALLOWED_ORIGINS` | Extra CORS origins passed to the backend |

Set up under **Settings → Secrets and variables → Actions**.

## Security notes

-   **Keyless auth.** Workload Identity Federation, no `GCP_SA_KEY` and no service-account JSON anywhere. The OIDC provider carries an attribute condition restricting it to this repository, so the provider path alone cannot be used by another repo.
-   **Secret Manager for credentials.** The backend deploy attaches `GEMINI_API_KEY` and `EMAIL_PASSWORD` with `--set-secrets`. They are deliberately not passed via `--set-env-vars`, which would leave them readable in Cloud Run revision metadata.
-   **Least privilege.** The deploy service account holds `run.admin`, `cloudbuild.builds.builder`, `artifactregistry.writer`, `iam.serviceAccountUser` and `secretmanager.secretAccessor` — not `editor` or `owner`.
-   **Deploys never run on pull requests.**

## Frontend deploy specifics

Cloudflare Pages uses **Direct Upload**: GitHub Actions builds and `wrangler pages deploy` uploads `dist/`. The build step must receive `VITE_BACKEND_URL` and `VITE_SITE_URL`, because Vite inlines them at build time.

This is also why `deploy-pages` rebuilds rather than reusing `verify`'s output: `verify` runs without secrets, so its bundle contains the config fallbacks rather than the real backend origin. Sharing that artifact would ship a frontend pointing at the wrong host.

The legacy Cloud Run `deploy` job remains until the Pages cutover is confirmed. Its generated Dockerfile ships the already-built `dist/` — an in-image `npm run build` receives none of the workflow env and would silently drop both variables.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `BILLING_DISABLED` / `PERMISSION_DENIED` on deploy | Billing not enabled on the GCP project — Artifact Registry and Cloud Build refuse to run without it |
| `deploy-pages` skipped | `CLOUDFLARE_PAGES_ENABLED` is not `true` |
| Frontend loads, API calls fail with CORS errors | Usually the backend is down — a 5xx from Cloud Run's front door carries no CORS headers. Check the backend responds before changing CORS config |
| Frontend calls the wrong backend | `VITE_BACKEND_URL` is build-time; rebuild and redeploy after changing it |
| Deep links 404 on Pages | `public/_redirects` missing from `dist/` |

Reference: [Cloud Run](https://cloud.google.com/run/docs) · [Cloudflare Pages](https://developers.cloudflare.com/pages/) · [GitHub Actions](https://docs.github.com/en/actions)
