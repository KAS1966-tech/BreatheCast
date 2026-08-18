from fastapi import APIRouter
from app.core.artifact import modelService

health_router = APIRouter()

@health_router.get("/health")
def health():
    return {
    "status": "healthy" if modelService.model is not None else "unhealthy",
    "model_loaded": modelService.model is not None
}