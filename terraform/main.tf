terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "kidtracker-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_artifact_registry_repository" "kidtracker" {
  location      = var.region
  repository_id = "kidtracker"
  description   = "KidTracker API container images"
  format        = "DOCKER"
}

resource "google_service_account" "cloud_run_sa" {
  account_id   = "kidtracker-run-sa"
  display_name = "KidTracker Cloud Run runtime"
}

resource "google_cloud_run_v2_service" "api" {
  name     = "kidtracker-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/kidtracker/api:${var.image_tag}"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "ALLOWED_ORIGIN"
        value = var.allowed_origin
      }
      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          memory = "512Mi"
          cpu    = "1"
        }
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 30
      }
    }
  }

  depends_on = [google_artifact_registry_repository.kidtracker]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_artifact_registry_repository_iam_member" "github_push" {
  location   = google_artifact_registry_repository.kidtracker.location
  repository = google_artifact_registry_repository.kidtracker.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:github-actions-sa@${var.project_id}.iam.gserviceaccount.com"
}


