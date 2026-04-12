"""
BiasProbe — Report Generator
Generates PDF bias audit reports using ReportLab.
"""

from __future__ import annotations
import io
import logging
import os
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from config import GCS_BUCKET_NAME, REPORTS_DIR
from models.schemas import BiasScore, ProbeResult, ScoreType

logger = logging.getLogger("biasProbe.report_gen")


# ── Color Palette ──────────────────────────────────────────────────────────────

BRAND_DARK = colors.HexColor("#0f172a")
BRAND_PRIMARY = colors.HexColor("#6366f1")
BRAND_SECONDARY = colors.HexColor("#8b5cf6")
SCORE_GREEN = colors.HexColor("#22c55e")
SCORE_YELLOW = colors.HexColor("#eab308")
SCORE_ORANGE = colors.HexColor("#f97316")
SCORE_RED = colors.HexColor("#ef4444")
BG_LIGHT = colors.HexColor("#f8fafc")
TEXT_MUTED = colors.HexColor("#64748b")


def _score_color(score: float) -> colors.Color:
    """Map a 0-1 bias score to a traffic-light color."""
    if score < 0.25:
        return SCORE_GREEN
    elif score < 0.5:
        return SCORE_YELLOW
    elif score < 0.75:
        return SCORE_ORANGE
    return SCORE_RED


def _score_label(score: float) -> str:
    """Human label for a bias score."""
    if score < 0.25:
        return "Low Bias"
    elif score < 0.5:
        return "Moderate Bias"
    elif score < 0.75:
        return "High Bias"
    return "Severe Bias"


# ── PDF Builder ────────────────────────────────────────────────────────────────

def build_report_pdf(
    audit_id: str,
    overall_score: float,
    bias_scores: list[BiasScore],
    probe_results: list[ProbeResult],
    template_versions: dict[str, str],
    target_endpoint: str,
) -> bytes:
    """Generate a complete PDF bias audit report. Returns raw PDF bytes."""

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=30 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=28,
        textColor=BRAND_DARK,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=TEXT_MUTED,
        spaceAfter=20,
    ))
    styles.add(ParagraphStyle(
        "SectionHead",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=BRAND_PRIMARY,
        spaceBefore=20,
        spaceAfter=10,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "BodyText2",
        parent=styles["Normal"],
        fontSize=10,
        textColor=BRAND_DARK,
        spaceAfter=6,
        leading=14,
    ))
    styles.add(ParagraphStyle(
        "FooterStyle",
        parent=styles["Normal"],
        fontSize=8,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
    ))

    elements = []
    now = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    # ── Page 1: Title + Executive Summary ──────────────────────────────────

    elements.append(Spacer(1, 40))
    elements.append(Paragraph("BiasProbe", styles["ReportTitle"]))
    elements.append(Paragraph("LLM Bias Audit Report", styles["ReportSubtitle"]))

    elements.append(HRFlowable(
        width="100%", thickness=1, color=BRAND_PRIMARY,
        spaceBefore=5, spaceAfter=15,
    ))

    # Audit metadata
    meta_data = [
        ["Audit ID:", audit_id],
        ["Target Endpoint:", target_endpoint[:60] + "..." if len(target_endpoint) > 60 else target_endpoint],
        ["Generated:", now],
        ["Probe Templates:", ", ".join(f"{k} (v{v})" for k, v in template_versions.items())],
    ]
    meta_table = Table(meta_data, colWidths=[120, 380])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), TEXT_MUTED),
        ("TEXTCOLOR", (1, 0), (1, -1), BRAND_DARK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 20))

    # Overall score card
    elements.append(Paragraph("Overall Bias Assessment", styles["SectionHead"]))

    score_color = _score_color(overall_score)
    score_data = [[
        Paragraph(f'<font size="32" color="{score_color.hexval()}">{overall_score:.2f}</font>', styles["BodyText2"]),
        Paragraph(
            f'<font size="14"><b>{_score_label(overall_score)}</b></font><br/>'
            f'<font size="10" color="{TEXT_MUTED.hexval()}">'
            f'Composite score across all categories and metrics. '
            f'0.0 = no detectable bias, 1.0 = extreme bias.</font>',
            styles["BodyText2"],
        ),
    ]]
    score_table = Table(score_data, colWidths=[100, 400])
    score_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 20))

    # ── Page 2: Per-category breakdown ─────────────────────────────────────

    elements.append(PageBreak())
    elements.append(Paragraph("Detailed Bias Scores", styles["SectionHead"]))
    elements.append(Paragraph(
        "Each category is tested across multiple metrics. Scores are normalized "
        "to a 0–1 scale where 0 indicates no detectable bias and 1 indicates extreme bias. "
        "Statistical significance is determined using standard hypothesis tests (α = 0.05).",
        styles["BodyText2"],
    ))
    elements.append(Spacer(1, 10))

    if bias_scores:
        # Build the scores table
        header = ["Category", "Metric", "Score", "p-value", "Significance"]
        table_data = [header]

        for score in sorted(bias_scores, key=lambda s: (s.category, s.score_type.value)):
            row = [
                score.category.replace("_", " ").title(),
                score.score_type.value.title(),
                f"{score.score:.3f}",
                f"{score.p_value:.4f}",
                score.significance_level,
            ]
            table_data.append(row)

        scores_table = Table(table_data, colWidths=[90, 80, 70, 70, 190])
        scores_table.setStyle(TableStyle([
            # Header
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            # Body
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("TEXTCOLOR", (0, 1), (-1, -1), BRAND_DARK),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            # Grid
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(scores_table)
    else:
        elements.append(Paragraph(
            "<i>No bias scores were computed for this audit.</i>",
            styles["BodyText2"],
        ))

    # ── Page 3: Probe sample ───────────────────────────────────────────────

    elements.append(PageBreak())
    elements.append(Paragraph("Sample Probe Results", styles["SectionHead"]))
    elements.append(Paragraph(
        "A selection of probe/response pairs showing how the target model "
        "responded to equivalent prompts with different demographic identifiers.",
        styles["BodyText2"],
    ))
    elements.append(Spacer(1, 10))

    # Show first 20 results as a sample
    sample = probe_results[:20]
    if sample:
        for r in sample:
            elements.append(Paragraph(
                f'<b>{r.category.title()} | {r.variant_group}</b> — '
                f'<font color="{TEXT_MUTED.hexval()}">{r.probe_id}</font>',
                styles["BodyText2"],
            ))
            elements.append(Paragraph(
                f'<b>Prompt:</b> {r.prompt[:200]}{"..." if len(r.prompt) > 200 else ""}',
                styles["BodyText2"],
            ))
            response_preview = r.response[:300] + "..." if len(r.response) > 300 else r.response
            elements.append(Paragraph(
                f'<b>Response:</b> {response_preview}',
                styles["BodyText2"],
            ))
            elements.append(Paragraph(
                f'<font color="{TEXT_MUTED.hexval()}" size="8">'
                f'Length: {r.metrics.response_length} | '
                f'Sentiment: {r.metrics.sentiment:.2f} | '
                f'Refusal: {"Yes" if r.metrics.refusal_detected else "No"}'
                f'</font>',
                styles["BodyText2"],
            ))
            elements.append(Spacer(1, 6))
            elements.append(HRFlowable(
                width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"),
                spaceBefore=2, spaceAfter=6,
            ))

    # ── Footer on every page ───────────────────────────────────────────────

    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        f"Generated by BiasProbe — LLM Bias Auditing Platform — {now}",
        styles["FooterStyle"],
    ))

    doc.build(elements)
    return buffer.getvalue()


# ── GCS Upload ─────────────────────────────────────────────────────────────────

def upload_pdf_to_gcs(audit_id: str, pdf_bytes: bytes) -> str:
    """Upload PDF to Google Cloud Storage and return the public URL.
    
    Falls back to local storage when GCS bucket is not configured.
    """
    if not GCS_BUCKET_NAME:
        # Save to cross-platform project-local directory (not /tmp/)
        local_path = str(REPORTS_DIR / f"biasProbe_report_{audit_id}.pdf")
        with open(local_path, "wb") as f:
            f.write(pdf_bytes)
        logger.info("PDF saved locally: %s", local_path)
        return local_path

    from google.cloud import storage as gcs_storage

    client = gcs_storage.Client()
    bucket = client.bucket(GCS_BUCKET_NAME)
    blob_name = f"reports/{audit_id}/report.pdf"
    blob = bucket.blob(blob_name)

    blob.upload_from_string(pdf_bytes, content_type="application/pdf")

    # Generate a signed URL valid for 7 days
    url = blob.generate_signed_url(
        version="v4",
        expiration=60 * 60 * 24 * 7,  # 7 days
        method="GET",
    )
    logger.info("PDF uploaded to GCS: %s", blob_name)
    return url
