resource "google_firestore_database" "kidcare" {
  project     = var.project_id
  name        = "kidcare"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}
