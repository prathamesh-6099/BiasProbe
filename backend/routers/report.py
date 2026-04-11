# TODO: Report router
# POST /api/report/{id}/generate
# GET  /api/report/{id}/pdf

from fastapi import APIRouter

router = APIRouter(prefix="/api/report", tags=["report"])
