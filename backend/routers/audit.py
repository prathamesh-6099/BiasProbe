# TODO: Audit router
# POST /api/audit/create
# POST /api/audit/{id}/run
# GET  /api/audit/{id}/status
# GET  /api/audit/{id}/results

from fastapi import APIRouter

router = APIRouter(prefix="/api/audit", tags=["audit"])
