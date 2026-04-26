#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  BiasProbe — One-Shot GCP + Firebase Setup Script
#  Usage: bash infra/setup.sh <PROJECT_ID> [REGION]
#  Example: bash infra/setup.sh my-biasprobeimage-project us-central1
#
#  What this script does:
#    1. Enables all required GCP APIs
#    2. Creates an Artifact Registry Docker repository
#    3. Creates a GCS bucket for audit results
#    4. Creates a Firebase project & enables Auth + Firestore
#    5. Creates a Cloud Run–ready service account + key
#    6. Writes a .env file with all keys filled in
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
PROJECT_ID="${1:-}"
REGION="${2:-us-central1}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "❌  Usage: bash infra/setup.sh <PROJECT_ID> [REGION]"
  exit 1
fi

BUCKET_NAME="${PROJECT_ID}-biasprobe-results"
AR_REPO="biasprobe-repo"
SERVICE_ACCOUNT_NAME="biasprobe-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="./backend/service_account.json"
ENV_FILE=".env"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   BiasProbe — GCP + Firebase One-Shot Setup      ║"
echo "║   Project : ${PROJECT_ID}"
echo "║   Region  : ${REGION}"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 0. Set active project ─────────────────────────────────────────────────────
echo "📌  Setting active GCP project..."
gcloud config set project "${PROJECT_ID}"

# ── 1. Enable APIs ────────────────────────────────────────────────────────────
echo "⚡  Enabling required GCP APIs (this takes ~2 min)..."
gcloud services enable \
  generativelanguage.googleapis.com \
  run.googleapis.com \
  storage.googleapis.com \
  bigquery.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  firebase.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT_ID}"
echo "   ✅  APIs enabled."

# ── 2. Artifact Registry repository ──────────────────────────────────────────
echo "🗄️   Creating Artifact Registry repo: ${AR_REPO}..."
gcloud artifacts repositories create "${AR_REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="BiasProbe backend Docker images" \
  --project="${PROJECT_ID}" 2>/dev/null || echo "   ℹ️   Repo already exists, skipping."
echo "   ✅  Artifact Registry ready."

# ── 3. GCS bucket for audit results ──────────────────────────────────────────
echo "🪣  Creating GCS bucket: gs://${BUCKET_NAME}..."
gcloud storage buckets create "gs://${BUCKET_NAME}" \
  --location="${REGION}" \
  --uniform-bucket-level-access \
  --project="${PROJECT_ID}" 2>/dev/null || echo "   ℹ️   Bucket already exists, skipping."
# Set lifecycle: delete objects older than 90 days to keep costs low
cat > /tmp/lifecycle.json <<'EOF'
{
  "lifecycle": {
    "rule": [{ "action": {"type":"Delete"}, "condition": {"age": 90} }]
  }
}
EOF
gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file=/tmp/lifecycle.json
echo "   ✅  GCS bucket ready (90-day lifecycle)."

# ── 4. Service account for Cloud Run ─────────────────────────────────────────
echo "🔑  Creating service account: ${SERVICE_ACCOUNT_EMAIL}..."
gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
  --display-name="BiasProbe Cloud Run SA" \
  --project="${PROJECT_ID}" 2>/dev/null || echo "   ℹ️   SA already exists, skipping."

# Grant required roles
for ROLE in \
  roles/datastore.user \
  roles/storage.objectAdmin \
  roles/bigquery.dataEditor \
  roles/bigquery.jobUser \
  roles/run.invoker; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="${ROLE}" --quiet
done

# Download key
echo "   📥  Downloading service account key → ${KEY_FILE}..."
gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SERVICE_ACCOUNT_EMAIL}" \
  --project="${PROJECT_ID}"
echo "   ✅  Service account ready."

# ── 5. Firebase — initialize project ─────────────────────────────────────────
echo "🔥  Initialising Firebase on project ${PROJECT_ID}..."
if command -v firebase &>/dev/null; then
  firebase projects:addfirebase "${PROJECT_ID}" --non-interactive 2>/dev/null \
    || echo "   ℹ️   Firebase already added, skipping."

  # Enable Firestore (native mode)
  echo "   📦  Enabling Firestore (native mode)..."
  gcloud firestore databases create \
    --location="${REGION}" \
    --project="${PROJECT_ID}" 2>/dev/null || echo "   ℹ️   Firestore already exists."

  # Enable Auth providers via Firebase Management API
  echo "   🔐  Enabling Firebase Auth (Email/Password + Google)..."
  echo "       → Visit: https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers"
  echo "         and enable Email/Password & Google sign-in manually (or use firebase CLI interactively)."
else
  echo "   ⚠️   firebase CLI not found. Install it: npm install -g firebase-tools"
  echo "       Then run: firebase projects:addfirebase ${PROJECT_ID}"
fi
echo "   ✅  Firebase step complete."

# ── 6. Get Gemini API key hint ────────────────────────────────────────────────
echo ""
echo "🤖  Gemini API Key:"
echo "    Get yours at → https://aistudio.google.com/app/apikey"
echo "    You will be prompted to paste it below."
echo ""
read -r -p "   Paste your GEMINI_API_KEY (or press Enter to skip): " GEMINI_KEY

# ── 7. Write .env file ────────────────────────────────────────────────────────
echo ""
echo "📝  Writing ${ENV_FILE}..."
cat > "${ENV_FILE}" <<EOF
# ── BiasProbe Environment Configuration ──────────────────────────────────────
# Auto-generated by infra/setup.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# !! Keep this file out of version control !!

# Google Cloud
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
GCS_BUCKET_NAME=${BUCKET_NAME}
GOOGLE_APPLICATION_CREDENTIALS=./backend/service_account.json

# Gemini (Google AI Studio)
GEMINI_API_KEY=${GEMINI_KEY:-YOUR_GEMINI_API_KEY_HERE}

# Firebase
FIREBASE_PROJECT_ID=${PROJECT_ID}
FIREBASE_SERVICE_ACCOUNT_JSON=./backend/service_account.json

# Cloud Run (filled after first deploy)
CLOUD_RUN_BACKEND_URL=https://${SERVICE_ACCOUNT_NAME}-<hash>-${REGION}.a.run.app

# BigQuery (optional analytics)
BIGQUERY_DATASET=biasprobe_analytics

# Demo mock API (for hackathon presentation)
DEMO_BIASED_API_URL=http://localhost:8001
EOF

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║   ✅  BiasProbe setup complete!                                      ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║  Artifact Registry : ${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
echo "║  GCS Bucket        : gs://${BUCKET_NAME}"
echo "║  Service Account   : ${SERVICE_ACCOUNT_EMAIL}"
echo "║  Key File          : ${KEY_FILE}"
echo "║  Env File          : ${ENV_FILE}"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                                         ║"
echo "║  1. Review .env and fill any missing values                          ║"
echo "║  2. Deploy: gcloud builds submit --config infra/cloudbuild.yaml .    ║"
echo "║  3. Update CLOUD_RUN_BACKEND_URL in .env + frontend/.env.local       ║"
echo "║  4. Enable Auth providers at Firebase Console                        ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
