# GitHub Actions Workflows

## Frontend Deployment Configuration

### Required GitHub Secrets

You need to configure these secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

#### Google Cloud Configuration

-   `GCP_PROD_PROJECT_ID`: Your production project ID (e.g., "my-portfolio-prod")
-   `GCP_DEV_PROJECT_ID`: Your development project ID (e.g., "my-portfolio-dev")
-   `GCP_REGION`: Currently using "me-west1"
-   `GCP_WORKLOAD_IDENTITY_PROVIDER`: From GCP Workload Identity setup
-   `GCP_SA_EMAIL`: Your service account email from GCP

#### Application Configuration

-   `VITE_BACKEND_URL`:
    -   Development: "https://backend-dev-240663900746.me-west1.run.app"
    -   Production: "https://backend-240663900746.me-west1.run.app"
-   `PROD_DOMAIN`: https://frontend-240663900746.me-west1.run.app
-   `DEV_DOMAIN`: "localhost:3000"

### How to Set Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each required secret listed above

### Security Features

-   ✅ Workload Identity Federation (more secure than key-based auth)
-   ✅ Minimal required permissions
-   ✅ Path-based deployment triggers
-   ✅ Dependency caching
-   ✅ Environment-specific configurations
-   ✅ Separated build/deploy steps

### Current Deployment Flow

1. Push to `main` -> Deploys to development environment
2. Push to `prod` -> Deploys to production environment

### Troubleshooting

If deployment fails, check:

1. GitHub Actions logs
2. Secret configurations
3. GCP service account permissions
4. Cloud Run service status

Need help? Check the [Cloud Run documentation](https://cloud.google.com/run/docs) or [GitHub Actions documentation](https://docs.github.com/en/actions)
