import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Load env
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
print("Available Models:")
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(f" - {m.name}")
