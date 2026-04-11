#!/bin/bash
# TODO: GCP one-time setup script
# Usage: bash setup.sh <PROJECT_ID>

PROJECT_ID=$1

echo "Setting up GCP project: $PROJECT_ID"

# Enable required APIs
gcloud services enable \
  generativelanguage.googleapis.com \
  run.googleapis.com \
  storage.googleapis.com \
  bigquery.googleapis.com \
  firebase.googleapis.com \
  --project=$PROJECT_ID

echo "APIs enabled. Next steps:"
echo "1. Create Firebase project at https://console.firebase.google.com"
echo "2. Download service account JSON and set FIREBASE_SERVICE_ACCOUNT_JSON"
echo "3. Get Gemini API key at https://aistudio.google.com"
