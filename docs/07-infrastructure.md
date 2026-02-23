# 7. Infrastructure & Deployment

## Overview

The application is deployed on **Google Cloud Platform** with infrastructure managed via **Terraform**.

```
┌──────────────────────────────────────────────────────┐
│                    GCP Project: kidcare-17eba          │
│                    Region: europe-west1                │
│                                                        │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │   Firebase    │   │  Cloud Run   │   │ Artifact  │ │
│  │   Hosting     │   │  (API)       │   │ Registry  │ │
│  │   (SPA)       │   │              │   │ (Docker)  │ │
│  └──────┬───────┘   └──────┬───────┘   └─────┬─────┘ │
│         │                  │                  │       │
│         │            ┌─────┴──────┐           │       │
│         │            │ Service    │           │       │
│         │            │ Account    │           │       │
│         │            │ (runtime)  │           │       │
│         │            └────────────┘           │       │
│         │                                     │       │
│  ┌──────┴───────────────────────────┐         │       │
│  │      Firestore (kidcare DB)      │         │       │
│  └──────────────────────────────────┘         │       │
│                                               │       │
│  ┌────────────────────────────────────────────┘       │
│  │  GitHub Actions SA (push images)                   │
│  └────────────────────────────────────────────────────│
└──────────────────────────────────────────────────────┘
```

## Terraform Resources

All Terraform config lives in the [terraform/](../terraform/) directory.

### State Backend

```hcl
backend "gcs" {
  bucket = "kidtracker-tfstate"
  prefix = "terraform/state"
}
```

Terraform state is stored in a GCS bucket.

### Resources Defined

| Resource | Terraform File | Description |
|---|---|---|
| `google_firestore_database.kidcare` | [firebase.tf](../terraform/firebase.tf) | Named Firestore database `kidcare` in native mode |
| `google_artifact_registry_repository.kidtracker` | [main.tf](../terraform/main.tf) | Docker container registry |
| `google_service_account.cloud_run_sa` | [main.tf](../terraform/main.tf) | Runtime service account for Cloud Run |
| `google_cloud_run_v2_service.api` | [main.tf](../terraform/main.tf) | Cloud Run service for the Express API |
| `google_cloud_run_v2_service_iam_member.public_invoker` | [main.tf](../terraform/main.tf) | Public access (allUsers) for the API |
| `google_artifact_registry_repository_iam_member.github_push` | [main.tf](../terraform/main.tf) | IAM for GitHub Actions to push Docker images |

### Variables

| Variable | Default | Description |
|---|---|---|
| `project_id` | `kidcare-17eba` | GCP project ID |
| `region` | `europe-west1` | GCP region |
| `image_tag` | (required) | Docker image tag (git SHA in CI) |
| `gemini_api_key` | (required, sensitive) | Gemini API key |
| `allowed_origin` | `https://kidcare-17eba.web.app` | CORS origin |

### Outputs

| Output | Description |
|---|---|
| `cloud_run_url` | Public URL of the Cloud Run API |
| `artifact_registry_repo` | Full path for Docker image pushes |

## Cloud Run Configuration

- **Image**: `europe-west1-docker.pkg.dev/kidcare-17eba/kidtracker/api:{tag}`
- **Scaling**: 0–3 instances (scales to zero when idle)
- **Resources**: 512 MiB memory, 1 vCPU
- **Health Check**: `GET /health` (liveness probe every 30s, initial delay 5s)
- **Environment**: `NODE_ENV=production`, `GOOGLE_CLOUD_PROJECT`, `ALLOWED_ORIGIN`, `GEMINI_API_KEY`

## Firebase Hosting

Configured in [firebase.json](../firebase.json). Serves the Vite-built static SPA. The frontend build output is deployed here.

## CI/CD Pipeline (GitHub Actions)

The Terraform config provisions a `github-actions-sa` service account with `artifactregistry.writer` role, implying a GitHub Actions workflow that:

1. Builds the Docker image for the API server.
2. Pushes it to Artifact Registry.
3. Runs `terraform apply` with the new image tag.
4. Builds the Vite frontend.
5. Deploys to Firebase Hosting.

## Deployment Checklist

1. **First-time setup**: Create GCS bucket for Terraform state, set up Firebase project.
2. **API deployment**: Build Docker image → push to Artifact Registry → `terraform apply`.
3. **Frontend deployment**: `npm run build` → `firebase deploy --only hosting`.
4. **Environment**: Set `VITE_API_BASE_URL` in `.env.production` to the Cloud Run URL from Terraform output.
