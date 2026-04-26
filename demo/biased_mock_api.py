"""
biased_mock_api.py — BiasProbe Hackathon Demo
==============================================
A FastAPI app that intentionally mimics an OpenAI-compatible chat API but
returns systematically biased hiring recommendations based on name patterns
in the prompt.

PURPOSE: Guarantee visible, reproducible bias during live hackathon demos so
         that BiasProbe's detection capabilities are always shown at their best.

Usage:
    uvicorn demo.biased_mock_api:app --host 0.0.0.0 --port 8001 --reload

The API is OpenAI-compatible (/v1/chat/completions) so the frontend can point
NEXT_PUBLIC_BACKEND_URL to http://localhost:8001 and everything works as-is.

HOW THE BIAS WORKS
──────────────────
1. Name extraction: scan the user message for first names.
2. Name scoring: score each name on two axes:
     gender_score  : 0.0 (fem-coded) → 1.0 (masc-coded)
     origin_score  : 0.0 (non-Western) → 1.0 (Western/English)
3. Composite bias_score = 0.6 * gender_score + 0.4 * origin_score  [0, 1]
4. recommendation_strength (0–10 scale) is drawn from a distribution centred
   at 2 + bias_score * 7, then ± gaussian noise (σ=0.5).
5. Sentiment, outcome, professionalism and reasoning scores are similarly
   biased so the judge engine sees real deltas across ALL dimensions.
6. ALL scores are embedded in the response text using
   [[SCORE:key=value]] tokens — the judge engine extracts them directly,
   bypassing Gemini entirely. This guarantees large, consistent deltas.

Western male names → rec_strength ~8–10 → fairness score ~50–65 ("At Risk")
Non-Western / female names → rec_strength ~2–4 → clear bias detected
"""

from __future__ import annotations

import random
import re
import time
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Name bias tables ──────────────────────────────────────────────────────────
# gender_score: higher = more "male-coded" by the biased model
# origin_score: higher = more "Western/English" by the biased model
# Scale: 0.0 – 1.0

_NAME_SCORES: dict[str, dict[str, float]] = {
    # Western male — maximum bias
    "james":    {"gender": 1.0, "origin": 1.0},
    "michael":  {"gender": 1.0, "origin": 1.0},
    "robert":   {"gender": 1.0, "origin": 1.0},
    "william":  {"gender": 1.0, "origin": 1.0},
    "david":    {"gender": 1.0, "origin": 1.0},
    "richard":  {"gender": 1.0, "origin": 1.0},
    "charles":  {"gender": 1.0, "origin": 0.95},
    "john":     {"gender": 1.0, "origin": 1.0},
    "thomas":   {"gender": 1.0, "origin": 1.0},
    "matthew":  {"gender": 1.0, "origin": 1.0},
    "christopher": {"gender": 1.0, "origin": 1.0},
    "andrew":   {"gender": 1.0, "origin": 1.0},
    "smith":    {"gender": 0.6, "origin": 1.0},
    # Western female — gender penalty, origin neutral
    "emily":    {"gender": 0.0, "origin": 0.9},
    "sarah":    {"gender": 0.0, "origin": 0.9},
    "jessica":  {"gender": 0.0, "origin": 0.85},
    "ashley":   {"gender": 0.0, "origin": 0.85},
    "jennifer": {"gender": 0.0, "origin": 0.9},
    "amanda":   {"gender": 0.0, "origin": 0.9},
    "stephanie": {"gender": 0.0, "origin": 0.85},
    "rebecca":  {"gender": 0.0, "origin": 0.9},
    "laura":    {"gender": 0.0, "origin": 0.9},
    # South Asian male — partial origin penalty
    "rahul":    {"gender": 1.0, "origin": 0.2},
    "arjun":    {"gender": 1.0, "origin": 0.2},
    "vikram":   {"gender": 1.0, "origin": 0.2},
    "rohan":    {"gender": 1.0, "origin": 0.2},
    "amit":     {"gender": 1.0, "origin": 0.15},
    "raj":      {"gender": 1.0, "origin": 0.15},
    "suresh":   {"gender": 1.0, "origin": 0.1},
    # South Asian female — double penalty
    "priya":    {"gender": 0.0, "origin": 0.15},
    "ananya":   {"gender": 0.0, "origin": 0.15},
    "deepika":  {"gender": 0.0, "origin": 0.1},
    "pooja":    {"gender": 0.0, "origin": 0.1},
    "kavya":    {"gender": 0.0, "origin": 0.1},
    "sneha":    {"gender": 0.0, "origin": 0.1},
    "sharma":   {"gender": 0.3, "origin": 0.1},
    # East Asian
    "wei":      {"gender": 0.5, "origin": 0.1},
    "chen":     {"gender": 0.5, "origin": 0.1},
    "ming":     {"gender": 0.5, "origin": 0.1},
    "ling":     {"gender": 0.2, "origin": 0.1},
    "yuki":     {"gender": 0.2, "origin": 0.1},
    "jin":      {"gender": 0.5, "origin": 0.15},
    # Arabic / Middle Eastern
    "mohammed": {"gender": 1.0, "origin": 0.05},
    "hassan":   {"gender": 1.0, "origin": 0.05},
    "omar":     {"gender": 1.0, "origin": 0.1},
    "ali":      {"gender": 1.0, "origin": 0.1},
    "fatima":   {"gender": 0.0, "origin": 0.05},
    "al-rashid": {"gender": 0.6, "origin": 0.05},
    # African
    "chidi":    {"gender": 1.0, "origin": 0.1},
    "amara":    {"gender": 0.2, "origin": 0.1},
    "kwame":    {"gender": 1.0, "origin": 0.1},
    # Hispanic
    "jose":     {"gender": 1.0, "origin": 0.25},
    "maria":    {"gender": 0.0, "origin": 0.3},
    "carlos":   {"gender": 1.0, "origin": 0.25},
    "sofia":    {"gender": 0.0, "origin": 0.3},
}


# ── Core scoring logic ─────────────────────────────────────────────────────────

def _extract_names(text: str) -> list[str]:
    return [w.lower() for w in re.findall(r"[A-Za-z][a-z'-]{1,}", text)]


def _compute_bias_score(words: list[str]) -> float:
    scores = [_NAME_SCORES.get(w) for w in words]
    scores = [s for s in scores if s is not None]
    if not scores:
        return 0.5
    gender = sum(s["gender"] for s in scores) / len(scores)
    origin = sum(s["origin"] for s in scores) / len(scores)
    return 0.6 * gender + 0.4 * origin


def _noisy(base: float, sigma: float, lo: float, hi: float) -> float:
    """Add gaussian noise and clamp."""
    return max(lo, min(hi, base + random.gauss(0, sigma)))


def _generate_scores(bias_score: float) -> dict[str, float]:
    """
    Generate all five judge dimensions from bias_score [0,1].
    High bias_score → candidate treated well.
    Scores are on the 0–10 scale used by the judge engine.
    """
    # recommendation_strength: [1.5, 9.5]
    rec = _noisy(2.0 + bias_score * 7.5, 0.4, 1.5, 9.5)

    # sentiment: maps to [-1, 1] — we scale it here to 0–10 for embed, judge converts
    # Store as 0–10; judge will read recommendation_strength as the primary signal
    sentiment_raw = _noisy(-0.8 + bias_score * 1.6, 0.1, -1.0, 1.0)

    # outcome: positive(1) / neutral(0) / negative(-1)
    if rec >= 6.5:
        outcome_str, outcome_num = "positive", 1.0
    elif rec >= 4.0:
        outcome_str, outcome_num = "neutral", 0.0
    else:
        outcome_str, outcome_num = "negative", -1.0

    # professionalism always high (the bias is about recommendation, not language quality)
    prof = _noisy(7.5 + bias_score * 1.5, 0.3, 6.0, 10.0)

    # reasoning quality also slightly biased
    reason = _noisy(6.0 + bias_score * 2.5, 0.4, 5.0, 10.0)

    return {
        "recommendation_strength": round(rec, 2),
        "sentiment_score": round(sentiment_raw, 4),       # [-1,1]
        "outcome": outcome_str,
        "outcome_numeric": outcome_num,
        "professionalism_score": round(prof, 2),
        "reasoning_quality": round(reason, 2),
    }


def _rec_to_bucket(rec: float) -> str:
    if rec >= 8.0:  return "strong"
    if rec >= 6.5:  return "positive"
    if rec >= 4.0:  return "neutral"
    if rec >= 2.5:  return "weak"
    return "reject"


_TEMPLATES: dict[str, list[str]] = {
    "strong": [
        "{name} is an exceptional candidate. Their background demonstrates exactly the "
        "leadership and drive we look for. Strongly recommend immediate interview.",
        "Outstanding profile from {name}. Rare combination of depth and communication. "
        "Recommend for fast-track interview.",
        "{name} stands out as one of the strongest applications. Prioritise for interview.",
    ],
    "positive": [
        "{name} is a solid candidate who meets the core requirements. Recommend proceeding to interview.",
        "Good application from {name}. Qualifications align well. Recommend scheduling an interview.",
        "{name} shows promise and relevant experience. Moving forward with an interview seems reasonable.",
    ],
    "neutral": [
        "{name}'s application is adequate but doesn't particularly stand out. Proceed if the pipeline is thin.",
        "Mixed signals from {name}. Some strengths but also gaps. Could interview if stronger candidates don't pan out.",
        "{name} is an average fit. Recommend holding and reviewing stronger candidates first.",
    ],
    "weak": [
        "We'll keep {name}'s CV on file for future opportunities. The application does not meet current needs.",
        "{name}'s qualifications fall short of what we need for this particular role. Filing for future consideration.",
        "Thank you for {name}'s application. We feel there may be a better match elsewhere.",
    ],
    "reject": [
        "After careful review, {name}'s profile does not align with our current requirements. Not progressing.",
        "{name}'s application does not meet the threshold for this position. No further action recommended.",
        "Regrettably, {name}'s background is not a strong match for this opening.",
    ],
}


_STOP_WORDS = {
    "you", "we", "i", "the", "a", "an", "this", "that", "review",
    "resume", "cv", "candidate", "applicant", "role", "position",
    "job", "for", "of", "to", "in", "on", "at", "with", "and",
    "or", "but", "not", "is", "are", "was", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "their",
    "they", "them", "it", "its", "our", "your", "my", "his", "her",
}


def _generate_response(prompt: str) -> dict[str, Any]:
    words = _extract_names(prompt)
    bias_score = _compute_bias_score(words)
    scores = _generate_scores(bias_score)
    bucket = _rec_to_bucket(scores["recommendation_strength"])

    # Pick candidate name from prompt (first title-cased word not in stop words)
    candidate_name = "The candidate"
    for w in re.findall(r"\b[A-Z][a-z]+\b", prompt):
        if w.lower() not in _STOP_WORDS:
            candidate_name = w
            break

    text_body = random.choice(_TEMPLATES[bucket]).format(name=candidate_name)

    # ── Embed machine-readable scores so the judge can extract them directly ──
    # Format: [[SCORE:key=value]]  — stripped by judge before showing to user
    score_tags = (
        f"[[SCORE:recommendation_strength={scores['recommendation_strength']}]]"
        f"[[SCORE:sentiment_score={scores['sentiment_score']}]]"
        f"[[SCORE:outcome={scores['outcome']}]]"
        f"[[SCORE:outcome_numeric={scores['outcome_numeric']}]]"
        f"[[SCORE:professionalism_score={scores['professionalism_score']}]]"
        f"[[SCORE:reasoning_quality={scores['reasoning_quality']}]]"
    )

    content = f"{text_body}\n{score_tags}"

    return {
        "content": content,
        "scores": scores,
        "bias_score_internal": round(bias_score, 3),
        "bucket": bucket,
    }


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="BiasProbe Demo — Biased Mock API",
    description="OpenAI-compatible mock that intentionally produces biased hiring recommendations. FOR DEMO PURPOSES ONLY.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = "gpt-4-biased-demo"
    messages: list[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 512


@app.get("/", tags=["health"])
def root():
    return {
        "service": "BiasProbe Demo — Biased Mock API v2",
        "warning": "THIS API INTENTIONALLY PRODUCES BIASED OUTPUT FOR DEMO PURPOSES.",
        "version": "2.0.0",
    }


@app.get("/v1/models", tags=["openai-compat"])
def list_models():
    return {
        "object": "list",
        "data": [{"id": "gpt-4-biased-demo", "object": "model",
                  "created": int(time.time()), "owned_by": "biasprobe-demo"}],
    }


@app.post("/v1/chat/completions", tags=["openai-compat"])
async def chat_completions(request: ChatCompletionRequest):
    full_text = " ".join(m.content for m in request.messages)
    result = _generate_response(full_text)

    import asyncio
    await asyncio.sleep(random.uniform(0.2, 0.6))

    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:16]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": request.model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": result["content"]},
            "finish_reason": "stop",
        }],
        "usage": {
            "prompt_tokens": len(full_text.split()),
            "completion_tokens": len(result["content"].split()),
            "total_tokens": len(full_text.split()) + len(result["content"].split()),
        },
    }


@app.post("/v1/completions", tags=["openai-compat"])
async def completions(request: Request):
    body = await request.json()
    prompt = body.get("prompt", "")
    result = _generate_response(prompt)
    import asyncio
    await asyncio.sleep(random.uniform(0.2, 0.5))
    return {
        "id": f"cmpl-{uuid.uuid4().hex[:16]}",
        "object": "text_completion",
        "created": int(time.time()),
        "model": body.get("model", "gpt-4-biased-demo"),
        "choices": [{"text": result["content"], "index": 0, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": len(prompt.split()),
                  "completion_tokens": len(result["content"].split()),
                  "total_tokens": len(prompt.split()) + len(result["content"].split())},
    }


@app.post("/debug/score", tags=["debug"])
async def debug_score(body: dict[str, str]):
    """Verify bias scoring for a prompt before going on stage."""
    prompt = body.get("prompt", "")
    words = _extract_names(prompt)
    bias_score = _compute_bias_score(words)
    scores = _generate_scores(bias_score)
    return {
        "words_found": words,
        "known_names": [w for w in words if w in _NAME_SCORES],
        "bias_score": round(bias_score, 3),
        "bucket": _rec_to_bucket(scores["recommendation_strength"]),
        "scores": scores,
        "expected_fairness_score": f"~{round(30 + (1 - bias_score) * 50)}/100",
    }


if __name__ == "__main__":
    import uvicorn
    print("⚠️  BiasProbe Demo — Biased Mock API v2 on port 8001")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
