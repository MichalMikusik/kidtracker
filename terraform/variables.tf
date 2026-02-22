variable "project_id" {
  description = "GCP project ID"
  default     = "kidcare-17eba"
}

variable "region" {
  description = "GCP region for all resources"
  default     = "europe-west1"
}

variable "image_tag" {
  description = "Docker image tag — set to git SHA in CI/CD"
  type        = string
}

variable "gemini_api_key" {
  description = "Google Gemini API key — passed from GitHub Actions secret"
  type        = string
  sensitive   = true
}

variable "allowed_origin" {
  description = "CORS allowed origin — your Firebase Hosting URL"
  type        = string
  default     = "https://kidcare-17eba.web.app"
}
