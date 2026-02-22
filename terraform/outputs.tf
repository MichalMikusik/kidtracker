output "cloud_run_url" {
  description = "Public URL of the Cloud Run API. Copy this into .env.production (VITE_API_BASE_URL) after the first deploy."
  value       = google_cloud_run_v2_service.api.uri
}

output "artifact_registry_repo" {
  description = "Artifact Registry repo path for Docker pushes"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/kidtracker"
}
