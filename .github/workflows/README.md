# GitHub Actions Workflows

Two workflows, each split into `verify` and `deploy`.

| Workflow | Triggers on | Jobs |
| --- | --- | --- |
| `frontend-deploy.yml` | changes under `frontend/**` | `verify` → `deploy-pages` (Cloudflare Pages) |
| `backend-deploy.yml` | changes under `backend/**` | `verify` → `deploy` (Cloud Run) |

The Cloudflare Worker in `edge/` is **not** deployed by CI. It changes rarely and
holds a secret that only Cloudflare should ever see; it is deployed by hand with
`npx wrangler deploy` — see [edge/README.md](../../edge/README.md).

## Why verify and deploy are separate

`verify` runs on **pull requests and pushes**, needs no cloud credentials, and deploys nothing:

-   frontend: `npm ci`, typecheck, lint, format check, link-preview copy check, build, `npm audit --audit-level=high`
-   backend: `pip install`, `compileall`, import smoke check, `pytest`, `pip-audit`

`deploy` is gated on `github.event_name == 'push'` and `needs: verify`. Both deploy jobs target **fixed service names with no per-PR isolation**, so running them for a pull request would overwrite the shared environment with unreviewed code, and two concurrent PRs would race for the same service.

The audits run in CI, so a newly disclosed advisory fails the build rather than sitting unnoticed.

## Required configuration

### Secrets

| Name | Value |
| --- | --- |
| `GCP_DEV_PROJECT_ID` | Target GCP project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource path |
| `GCP_SA_EMAIL` | Deploy service account address |
| `EMAIL_ADDRESS`, `YOUR_EMAIL` | SMTP sender / recipient |
| `CLOUDFLARE_API_TOKEN` | Scope: Account → Cloudflare Pages → Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |

### Variables

| Name | Value |
| --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | Pages project name |
| `CLOUDFLARE_PAGES_ENABLED` | `true` arms the Pages deploy — set **last** |
| `GCP_RUNTIME_SA` | Service account the Cloud Run container runs as |
| `ALLOWED_ORIGINS` | Extra CORS origins passed to the backend |

Set up under **Settings → Secrets and variables → Actions**.

The frontend's build values are **not** here. Site URL, backend URL and avatar
URL live in `frontend/site.config.ts`, because Vite inlines them at build time
and a value held outside the repository only takes effect on the next build.
The region (`me-west1`) and the Cloud Run service name are literals in
`backend-deploy.yml`.

`GCP_RUNTIME_SA` is a variable rather than a secret because a service account
email is an identifier, not a credential — the deploy is authorised by Workload
Identity Federation, which is scoped to this repository.

## Security notes

-   **Keyless auth.** Workload Identity Federation, no `GCP_SA_KEY` and no service-account JSON anywhere. The OIDC provider carries an attribute condition restricting it to this repository, so the provider path alone cannot be used by another repo.
-   **Secret Manager for credentials.** The backend deploy attaches `GEMINI_API_KEY`, `EMAIL_PASSWORD` and `ORIGIN_SHARED_SECRET` with `--set-secrets`. They are deliberately not passed via `--set-env-vars`, which would leave them readable in Cloud Run revision metadata.
-   **Separate deploy and runtime identities.** `--service-account` sets what the container *runs as*, and it is not the account that deploys it. The deploy account holds `run.admin`, `cloudbuild.builds.builder`, `artifactregistry.writer`, `iam.serviceAccountUser` and `secretmanager.secretAccessor`; code execution inside a container running as that account could redeploy the service, push images and read every secret in the project. `GCP_RUNTIME_SA` can read the three secrets above and nothing else.
-   **Deploys never run on pull requests.**

## Frontend deploy specifics

Cloudflare Pages uses **Direct Upload**: GitHub Actions builds and `wrangler pages deploy` uploads `dist/`. Nothing is configured in the Cloudflare dashboard's build settings — with Direct Upload, Cloudflare never builds, so anything set there is ignored.

`deploy-pages` runs its own build rather than reusing `verify`'s output because jobs get separate runners and no artifact is passed between them. Both builds produce the same bundle: every build value is committed in `frontend/site.config.ts`.

`--branch` drives Pages' production vs preview split, and is set from the pushed branch. Set the Pages project's production branch to `prod` to mirror the Cloud Run flow.

## Backend deploy specifics

`gcloud run deploy --source .` builds from a Dockerfile the workflow writes at deploy time, which overwrites the committed `backend/Dockerfile`. Keep the two in step — the committed one is what a local `docker build` uses.

There is no custom-domain step: Cloud Run domain mappings are not available in `me-west1`. The public API hostname is served by the Worker in `edge/`, which forwards to the service's `run.app` URL.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `BILLING_DISABLED` / `PERMISSION_DENIED` on deploy | Billing not enabled on the GCP project — Artifact Registry and Cloud Build refuse to run without it |
| `deploy-pages` skipped | `CLOUDFLARE_PAGES_ENABLED` is not `true` |
| Frontend loads, API calls fail with CORS errors | Usually the backend is down — a 5xx from Cloud Run's front door carries no CORS headers. Check the backend responds before changing CORS config |
| API returns 403 to everything | The Worker's `EDGE_SECRET` and the backend's `ORIGIN_SHARED_SECRET` do not match |
| Frontend calls the wrong backend | `backendUrl` in `frontend/site.config.ts` is build-time; commit the change so a new build ships |
| Deep links 404 on Pages | `public/_redirects` missing from `dist/` |

Reference: [Cloud Run](https://cloud.google.com/run/docs) · [Cloudflare Pages](https://developers.cloudflare.com/pages/) · [GitHub Actions](https://docs.github.com/en/actions)
