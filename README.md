# BiasProbe 🔍

> An LLM bias testing SaaS platform that audits GenAI applications for demographic bias.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python 3.11) on Google Cloud Run |
| Auth + DB | Firebase Auth + Firestore (Spark free plan) |
| File Storage | Google Cloud Storage (free tier) |
| AI | Gemini 1.5 Flash API (free tier) |
| Stats | Python scipy + numpy |

---

## Monorepo Structure

```
BiasProbe/
├── frontend/               # Next.js 14 app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── audit/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── reports/[id]/page.tsx
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── .env.local.example
├── backend/                # FastAPI app
│   ├── main.py
│   ├── routers/
│   │   ├── audit.py
│   │   └── report.py
│   ├── requirements.txt
│   └── .env.example
├── infra/                  # Deployment config
│   ├── Dockerfile
│   ├── cloudbuild.yaml
│   └── setup.sh
├── probe-templates/        # Bias audit scenarios
│   ├── gender-bias.json
│   ├── racial-bias.json
│   └── age-bias.json
├── .env.example
└── README.md
```

---

## Setup Guide

### Step 1 — Create GCP Project & Enable APIs

```bash
# Create a new GCP project
gcloud projects create YOUR_PROJECT_ID --name="BiasProbe"
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
bash infra/setup.sh YOUR_PROJECT_ID
```

APIs enabled:
- `generativelanguage.googleapis.com` — Gemini AI
- `run.googleapis.com` — Cloud Run
- `storage.googleapis.com` — Cloud Storage
- `bigquery.googleapis.com` — BigQuery
- `firebase.googleapis.com` — Firebase

### Step 2 — Get Gemini API Key (Free)

1. Go to [https://aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API Key** → **Create API Key**
4. Copy the key and set it as `GEMINI_API_KEY` in your `.env`

### Step 3 — Create Firebase Project & Download Service Account

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → link to your GCP project
3. Enable **Firestore** (Native mode) and **Firebase Auth**
4. Go to **Project Settings → Service Accounts**
5. Click **Generate new private key** → download the JSON file
6. Set the path or contents as `FIREBASE_SERVICE_ACCOUNT_JSON` in your `.env`

### Step 4 — Run Locally

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your values
uvicorn main:app --reload
# API available at http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local   # Fill in your values
npm run dev
# App available at http://localhost:3000
```

### Step 5 — Deploy

**Backend → Cloud Run:**
```bash
gcloud run deploy biasProbe-backend \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --project YOUR_PROJECT_ID
```

**Frontend → Firebase Hosting:**
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Gemini 1.5 Flash API key from AI Studio |
| `FIREBASE_PROJECT_ID` | Your Firebase/GCP project ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Path to or JSON string of service account key |
| `GCS_BUCKET_NAME` | Google Cloud Storage bucket name |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID for Cloud SDK |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audit/create` | Create a new audit |
| POST | `/api/audit/{id}/run` | Start running an audit |
| GET | `/api/audit/{id}/status` | Poll audit progress |
| GET | `/api/audit/{id}/results` | Fetch audit results |
| POST | `/api/report/{id}/generate` | Generate a full report |
| GET | `/api/report/{id}/pdf` | Download report as PDF |

---

## License

MIT
