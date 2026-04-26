import os
import sys
from dotenv import load_dotenv
from google.cloud import storage

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "backend", "service_account.json")

project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
bucket_name = f"biasprobe-audit-{project_id}"

print(f"Attempting to create bucket: {bucket_name}")
client = storage.Client(project=project_id)

try:
    bucket = client.create_bucket(bucket_name, location="US")
    print(f"Successfully created bucket {bucket.name}")
except Exception as e:
    print(f"Error creating bucket: {e}")
    # If it already exists, that's fine
    if "409" in str(e):
        print("Bucket already exists! That's perfectly fine.")
