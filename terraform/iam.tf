# IAM bindings for the GitHub Actions service account
# These roles are required for CI/CD (deploy.yml) to:
#   - Push images to Artifact Registry
#   - Deploy Cloud Run services
#   - Deploy Firebase Hosting + Firestore rules
#   - Manage IAM and service accounts for Terraform

locals {
  github_sa = "serviceAccount:github-actions-sa@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "github_sa_roles" {
  for_each = toset([
    "roles/artifactregistry.admin",
    "roles/datastore.owner",
    "roles/run.admin",
    "roles/firebasehosting.admin",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.serviceAccountUser",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  project = var.project_id
  role    = each.value
  member  = local.github_sa
}
