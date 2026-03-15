# Artifact Registry repository with auto-cleanup policy
# Keeps only the latest tagged image; deletes untagged images older than 7 days.

resource "google_artifact_registry_repository" "kidtracker" {
  location      = var.region
  repository_id = "kidtracker"
  description   = "KidTracker API container images"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-latest"
    action = "KEEP"

    most_recent_versions {
      keep_count = 1
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"

    condition {
      older_than = "604800s" # 7 days
      tag_state  = "UNTAGGED"
    }
  }

  cleanup_policies {
    id     = "delete-old-tagged"
    action = "DELETE"

    condition {
      older_than = "604800s" # 7 days
      tag_state  = "TAGGED"
      tag_prefixes = ["sha-"]
    }
  }

  cleanup_policy_dry_run = false
}

resource "google_artifact_registry_repository_iam_member" "github_push" {
  location   = google_artifact_registry_repository.kidtracker.location
  repository = google_artifact_registry_repository.kidtracker.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:github-actions-sa@${var.project_id}.iam.gserviceaccount.com"
}
