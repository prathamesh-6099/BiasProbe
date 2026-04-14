"""
BiasProbe — Firestore Client
CRUD helpers for audits, probe results, bias scores, and reports.
"""

from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from google.cloud.firestore_v1 import FieldFilter

from config import get_firestore_client
from models.schemas import (
    AuditCreateRequest, AuditStatus, AuditProgress,
    ProbeResult, BiasScore,
)

logger = logging.getLogger("biasProbe.firestore")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Audits ─────────────────────────────────────────────────────────────────────

def create_audit(user_id: str, req: AuditCreateRequest) -> str:
    """Create a new audit document. Returns the audit ID."""
    db = get_firestore_client()
    audit_id = uuid.uuid4().hex

    doc = {
        "userId": user_id,
        "targetEndpoint": req.target_endpoint,
        "targetSystemPrompt": req.target_system_prompt,
        "probeTemplateIds": req.probe_template_ids,
        "probeMode": req.probe_mode.value,
        "config": req.config.model_dump(),
        "status": AuditStatus.CREATED.value,
        "progress": {"completed": 0, "total": 0},
        "probeTemplateVersions": {},
        "createdAt": _now(),
        "updatedAt": _now(),
        "startedAt": None,
        "completedAt": None,
        "attestationHash": None,
    }

    db.collection("audits").document(audit_id).set(doc)
    logger.info("Created audit %s for user %s", audit_id, user_id)
    return audit_id


def get_audit(audit_id: str) -> Optional[dict]:
    """Fetch an audit document by ID."""
    db = get_firestore_client()
    doc = db.collection("audits").document(audit_id).get()
    if doc.exists:
        data = doc.to_dict()
        data["auditId"] = doc.id
        return data
    return None


def update_audit_status(
    audit_id: str,
    status: AuditStatus,
    progress: Optional[AuditProgress] = None,
    extra_fields: Optional[dict] = None,
):
    """Update audit status and optionally progress/other fields."""
    db = get_firestore_client()
    update = {
        "status": status.value,
        "updatedAt": _now(),
    }
    if progress:
        update["progress"] = {"completed": progress.completed, "total": progress.total}
    if status == AuditStatus.RUNNING:
        update["startedAt"] = _now()
    if status in (AuditStatus.COMPLETED, AuditStatus.FAILED):
        update["completedAt"] = _now()
    if extra_fields:
        update.update(extra_fields)

    db.collection("audits").document(audit_id).update(update)
    logger.debug("Updated audit %s status to %s", audit_id, status.value)


def list_audits(user_id: str, limit: int = 50) -> list[dict]:
    """List audits for a user, most recent first."""
    db = get_firestore_client()
    docs = (
        db.collection("audits")
        .where(filter=FieldFilter("userId", "==", user_id))
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["auditId"] = doc.id
        results.append(data)
    logger.debug("Listed %d audits for user %s", len(results), user_id)
    return results


# ── Probe Results ──────────────────────────────────────────────────────────────

def save_probe_result(audit_id: str, result: ProbeResult):
    """Save a single probe result to the audit's subcollection."""
    db = get_firestore_client()
    result_id = uuid.uuid4().hex
    db.collection("audits").document(audit_id)\
      .collection("probeResults").document(result_id)\
      .set(result.model_dump())


def save_probe_results_batch(audit_id: str, results: list[ProbeResult]):
    """Save multiple probe results in a batch write."""
    if not results:
        return

    db = get_firestore_client()
    batch = db.batch()
    audit_ref = db.collection("audits").document(audit_id)

    for result in results:
        result_id = uuid.uuid4().hex
        doc_ref = audit_ref.collection("probeResults").document(result_id)
        batch.set(doc_ref, result.model_dump())

    batch.commit()
    logger.debug("Saved %d probe results for audit %s", len(results), audit_id)


def get_probe_results(audit_id: str) -> list[dict]:
    """Fetch all probe results for an audit."""
    db = get_firestore_client()
    docs = (
        db.collection("audits").document(audit_id)
        .collection("probeResults")
        .stream()
    )
    return [doc.to_dict() for doc in docs]


# ── Bias Scores ────────────────────────────────────────────────────────────────

def save_bias_scores(audit_id: str, scores: list[BiasScore]):
    """Save bias scores as a subcollection of the audit."""
    if not scores:
        return

    db = get_firestore_client()
    batch = db.batch()
    audit_ref = db.collection("audits").document(audit_id)

    for score in scores:
        score_id = uuid.uuid4().hex
        doc_ref = audit_ref.collection("biasScores").document(score_id)
        batch.set(doc_ref, score.model_dump())

    batch.commit()
    logger.debug("Saved %d bias scores for audit %s", len(scores), audit_id)


def get_bias_scores(audit_id: str) -> list[dict]:
    """Fetch all bias scores for an audit."""
    db = get_firestore_client()
    docs = (
        db.collection("audits").document(audit_id)
        .collection("biasScores")
        .stream()
    )
    return [doc.to_dict() for doc in docs]


# ── Reports ────────────────────────────────────────────────────────────────────

def create_report(audit_id: str, pdf_url: str) -> str:
    """Create a report document linked to an audit."""
    db = get_firestore_client()
    report_id = uuid.uuid4().hex

    doc = {
        "auditId": audit_id,
        "pdfUrl": pdf_url,
        "generatedAt": _now(),
        "remediationSuggestions": [],
        "complianceMappings": {},
        "brandingOverride": None,
    }
    db.collection("reports").document(report_id).set(doc)
    logger.info("Created report %s for audit %s", report_id, audit_id)
    return report_id


def get_report_by_audit(audit_id: str) -> Optional[dict]:
    """Fetch report for an audit."""
    db = get_firestore_client()
    docs = (
        db.collection("reports")
        .where(filter=FieldFilter("auditId", "==", audit_id))
        .limit(1)
        .stream()
    )
    for doc in docs:
        data = doc.to_dict()
        data["reportId"] = doc.id
        return data
    return None
