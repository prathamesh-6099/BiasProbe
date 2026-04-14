"""
BiasProbe — Pydantic Models
Request/response schemas for all API endpoints.
"""

from __future__ import annotations
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from enum import Enum
from datetime import datetime


# ── Enums ──────────────────────────────────────────────────────────────────────

class AuditStatus(str, Enum):
    CREATED = "created"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ProbeMode(str, Enum):
    STATIC = "static"
    DYNAMIC = "dynamic"


class BiasCategory(str, Enum):
    GENDER = "gender"
    RACE = "race"
    AGE = "age"


class ScoreType(str, Enum):
    LENGTH = "length"
    SENTIMENT = "sentiment"
    REFUSAL = "refusal"
    SEMANTIC = "semantic"


# ── Audit Schemas ──────────────────────────────────────────────────────────────

class AuditConfig(BaseModel):
    probe_count: int = Field(default=10, ge=1, le=100, description="Probes per category")
    intersectional: bool = Field(default=False, description="Enable intersectional analysis")
    semantic_similarity: bool = Field(default=False, description="Enable semantic similarity scoring")
    webhook_url: Optional[str] = Field(default=None, description="Webhook URL for completion callback")


class AuditCreateRequest(BaseModel):
    target_endpoint: str = Field(..., description="URL of the LLM API to audit")
    target_system_prompt: Optional[str] = Field(default=None, description="System prompt for dynamic probe generation")
    probe_template_ids: list[str] = Field(
        default=["gender-bias", "racial-bias", "age-bias"],
        description="Probe template IDs to use"
    )
    probe_mode: ProbeMode = Field(default=ProbeMode.DYNAMIC, description="Static templates or dynamic generation")
    config: AuditConfig = Field(default_factory=AuditConfig)


class AuditProgress(BaseModel):
    completed: int = 0
    total: int = 0


class AuditResponse(BaseModel):
    audit_id: str
    status: AuditStatus
    progress: AuditProgress
    probe_mode: ProbeMode
    probe_template_ids: list[str]
    target_endpoint: str
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class AuditStatusResponse(BaseModel):
    audit_id: str
    status: AuditStatus
    progress: AuditProgress
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


# ── Probe Schemas ──────────────────────────────────────────────────────────────

class ProbeVariant(BaseModel):
    group: str
    name: str
    additional_context: Optional[str] = None


class Probe(BaseModel):
    id: str
    base_prompt: str
    variants: dict[str, ProbeVariant]
    domain: Optional[str] = None
    expected_behavior: str = "equivalent"


class ProbeTemplate(BaseModel):
    id: str
    name: str
    description: str
    version: str
    category: str = ""
    probes: list[Probe] = []


class ProbeResultMetrics(BaseModel):
    response_length: int = 0
    sentiment: float = 0.0
    refusal_detected: bool = False


class ProbeResult(BaseModel):
    probe_id: str
    category: str
    variant_group: str
    prompt: str
    response: str
    metrics: ProbeResultMetrics


# ── Bias Score Schemas ─────────────────────────────────────────────────────────

class BiasScore(BaseModel):
    category: str
    score_type: ScoreType
    score: float = Field(ge=0.0, le=1.0, description="Normalized bias score (0=no bias, 1=extreme)")
    p_value: float = Field(ge=0.0, le=1.0)
    significance_level: str = Field(default="not significant")
    details: dict = Field(default_factory=dict)


class AuditResultsResponse(BaseModel):
    audit_id: str
    status: AuditStatus
    bias_scores: list[BiasScore]
    probe_results: list[ProbeResult]
    overall_score: float = Field(ge=0.0, le=1.0, description="Weighted average bias score")
    probe_template_versions: dict[str, str] = Field(default_factory=dict)


# ── Report Schemas ─────────────────────────────────────────────────────────────

class ReportGenerateRequest(BaseModel):
    include_remediation: bool = Field(default=False, description="Include AI remediation suggestions")
    include_compliance: bool = Field(default=False, description="Include compliance mapping")


class ReportResponse(BaseModel):
    report_id: str
    audit_id: str
    pdf_url: Optional[str] = None
    generated_at: Optional[str] = None
