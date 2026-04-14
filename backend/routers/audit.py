"""
BiasProbe — Audit Router
Endpoints for creating, running, and querying bias audits.
"""

from __future__ import annotations
import asyncio
import logging
import traceback

from fastapi import APIRouter, HTTPException, BackgroundTasks

from models.schemas import (
    AuditCreateRequest, AuditResponse, AuditStatusResponse,
    AuditResultsResponse, AuditStatus, AuditProgress, BiasScore, ProbeResult,
)
from services.firebase_client import (
    create_audit, get_audit, update_audit_status,
    get_probe_results, get_bias_scores, save_bias_scores,
    list_audits,
)
from services.probe_runner import run_probes_for_audit, get_template_versions
from services.stats import calculate_bias_scores, compute_overall_score

router = APIRouter(prefix="/api/audit", tags=["audit"])
logger = logging.getLogger("biasProbe.audit")

# Placeholder user ID (Phase 4 adds real Firebase Auth)
DEFAULT_USER_ID = "anonymous"


@router.post("/create", response_model=AuditResponse)
async def create_new_audit(req: AuditCreateRequest):
    """Create a new audit configuration. Does not start the probes yet."""
    try:
        audit_id = create_audit(DEFAULT_USER_ID, req)
        audit = get_audit(audit_id)

        return AuditResponse(
            audit_id=audit_id,
            status=AuditStatus.CREATED,
            progress=AuditProgress(completed=0, total=0),
            probe_mode=req.probe_mode,
            probe_template_ids=req.probe_template_ids,
            target_endpoint=req.target_endpoint,
            created_at=audit.get("createdAt") if audit else None,
        )
    except Exception as e:
        logger.exception("Failed to create audit")
        raise HTTPException(status_code=500, detail=f"Failed to create audit: {str(e)}")


def _execute_audit_sync(audit_id: str, req: AuditCreateRequest):
    """Background task: run probes, compute stats, save scores.

    This is a synchronous wrapper that runs the async probe runner
    via asyncio.run(). FastAPI's BackgroundTasks calls background
    functions synchronously in a threadpool, so we must not pass
    an async function directly.
    """
    try:
        logger.info("Starting audit execution for %s", audit_id)

        # Run all probes against the target LLM
        results = asyncio.run(run_probes_for_audit(audit_id, req))

        # Compute statistical bias scores
        probe_results = [r for r in results]
        bias_scores = calculate_bias_scores(probe_results)

        # Save scores to Firestore
        save_bias_scores(audit_id, bias_scores)

        # Compute overall score
        overall = compute_overall_score(bias_scores)

        # Mark audit as completed
        update_audit_status(
            audit_id,
            AuditStatus.COMPLETED,
            extra_fields={"overallScore": overall},
        )
        logger.info("Audit %s completed with overall score %.4f", audit_id, overall)
    except Exception as e:
        logger.exception("Audit %s failed", audit_id)
        update_audit_status(
            audit_id,
            AuditStatus.FAILED,
            extra_fields={"error": str(e)},
        )


@router.post("/{audit_id}/run", response_model=AuditStatusResponse)
async def run_audit(audit_id: str, background_tasks: BackgroundTasks):
    """Start running an audit. Probes execute in the background."""
    audit = get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit["status"] not in (AuditStatus.CREATED.value, AuditStatus.FAILED.value):
        raise HTTPException(
            status_code=400,
            detail=f"Audit is already {audit['status']}. Cannot restart."
        )

    # Reconstruct the request from the stored audit doc
    req = AuditCreateRequest(
        target_endpoint=audit["targetEndpoint"],
        target_system_prompt=audit.get("targetSystemPrompt"),
        probe_template_ids=audit["probeTemplateIds"],
        probe_mode=audit["probeMode"],
        config=audit.get("config", {}),
    )

    # Update status to queued
    update_audit_status(audit_id, AuditStatus.QUEUED)

    # Run synchronous wrapper in background (FastAPI runs this in a threadpool)
    background_tasks.add_task(_execute_audit_sync, audit_id, req)
    logger.info("Audit %s queued for background execution", audit_id)

    return AuditStatusResponse(
        audit_id=audit_id,
        status=AuditStatus.QUEUED,
        progress=AuditProgress(completed=0, total=0),
    )


@router.get("/{audit_id}/status", response_model=AuditStatusResponse)
async def get_audit_status(audit_id: str):
    """Poll the current status and progress of an audit."""
    audit = get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    progress = audit.get("progress", {})
    return AuditStatusResponse(
        audit_id=audit_id,
        status=AuditStatus(audit["status"]),
        progress=AuditProgress(
            completed=progress.get("completed", 0),
            total=progress.get("total", 0),
        ),
        started_at=audit.get("startedAt"),
        completed_at=audit.get("completedAt"),
    )


@router.get("/{audit_id}/results", response_model=AuditResultsResponse)
async def get_audit_results(audit_id: str):
    """Fetch completed audit results including bias scores and probe results."""
    audit = get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit["status"] != AuditStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400,
            detail=f"Audit is {audit['status']}. Results available only when completed."
        )

    # Fetch scores and results from subcollections
    raw_scores = get_bias_scores(audit_id)
    raw_results = get_probe_results(audit_id)

    bias_scores = [BiasScore(**s) for s in raw_scores]
    probe_results = [ProbeResult(**r) for r in raw_results]
    overall = audit.get("overallScore", compute_overall_score(bias_scores))

    return AuditResultsResponse(
        audit_id=audit_id,
        status=AuditStatus.COMPLETED,
        bias_scores=bias_scores,
        probe_results=probe_results,
        overall_score=overall,
        probe_template_versions=audit.get("probeTemplateVersions", {}),
    )


@router.get("/list/all")
async def list_all_audits():
    """List all audits for the current user (placeholder user)."""
    try:
        audits = list_audits(DEFAULT_USER_ID, limit=50)
        return {"audits": audits}
    except Exception as e:
        logger.exception("Failed to list audits")
        raise HTTPException(status_code=500, detail=f"Failed to list audits: {str(e)}")
