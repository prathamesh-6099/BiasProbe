"""
BiasProbe — Report Router
Endpoints for generating and downloading PDF bias audit reports.
"""

from __future__ import annotations
import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, RedirectResponse
import io

from models.schemas import (
    ReportGenerateRequest, ReportResponse,
    BiasScore, ProbeResult, AuditStatus,
)
from services.firebase_client import (
    get_audit, get_bias_scores, get_probe_results,
    create_report, get_report_by_audit,
)
from services.report_generator import build_report_pdf, upload_pdf_to_gcs
from services.stats import compute_overall_score

router = APIRouter(prefix="/api/report", tags=["report"])
logger = logging.getLogger("biasProbe.report")


@router.post("/{audit_id}/generate", response_model=ReportResponse)
async def generate_report(audit_id: str, req: ReportGenerateRequest = ReportGenerateRequest()):
    """Generate a PDF bias audit report for a completed audit."""
    audit = get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit["status"] != AuditStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate report: audit is {audit['status']}."
        )

    # Fetch data
    raw_scores = get_bias_scores(audit_id)
    raw_results = get_probe_results(audit_id)

    bias_scores = [BiasScore(**s) for s in raw_scores]
    probe_results = [ProbeResult(**r) for r in raw_results]
    overall = audit.get("overallScore", compute_overall_score(bias_scores))
    template_versions = audit.get("probeTemplateVersions", {})

    # Build PDF
    logger.info("Generating PDF report for audit %s", audit_id)
    pdf_bytes = build_report_pdf(
        audit_id=audit_id,
        overall_score=overall,
        bias_scores=bias_scores,
        probe_results=probe_results,
        template_versions=template_versions,
        target_endpoint=audit["targetEndpoint"],
    )

    # Upload to GCS (or save locally in dev)
    pdf_url = upload_pdf_to_gcs(audit_id, pdf_bytes)
    logger.info("PDF saved: %s", pdf_url)

    # Save report doc to Firestore
    report_id = create_report(audit_id, pdf_url)

    return ReportResponse(
        report_id=report_id,
        audit_id=audit_id,
        pdf_url=pdf_url,
    )


@router.get("/{audit_id}/pdf")
async def download_report_pdf(audit_id: str):
    """Download the generated PDF report for an audit."""
    # Check if report exists
    report = get_report_by_audit(audit_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found. Generate one first with POST /api/report/{id}/generate"
        )

    pdf_url = report.get("pdfUrl", "")

    # If it's a local file path (dev mode), stream it directly
    # Use os.path.isabs() for cross-platform detection instead of hardcoded /tmp/ or C:
    if os.path.isabs(pdf_url) and os.path.exists(pdf_url):
        try:
            with open(pdf_url, "rb") as f:
                pdf_content = f.read()
            return StreamingResponse(
                io.BytesIO(pdf_content),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=biasProbe_report_{audit_id}.pdf"
                },
            )
        except FileNotFoundError:
            logger.error("PDF file not found at %s", pdf_url)
            raise HTTPException(status_code=404, detail="PDF file not found on disk")

    # If it's a GCS signed URL, redirect to it
    return RedirectResponse(url=pdf_url)
