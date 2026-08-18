from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.health import health_router
from app.api.routes import router
from app.core.logger import logger
from app.core.artifact import modelService

@asynccontextmanager
async def lifespan(app: FastAPI):

    try:
        logger.info("Starting application...")

        modelService.load_artifact()
        logger.info("Artifacts loaded.")

        modelService.load_model()
        logger.info("Model loaded.")

        logger.info("Configuration loaded.")

        logger.info("Database initialized.")

        logger.info("Application started successfully.")

    except Exception:
        logger.exception("Failed to start app")
        raise

    yield


app = FastAPI(version=settings.API_VERSION,title=settings.API_TITLE,lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=[
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE"
],
    allow_headers=["*"],
)

app.include_router(
    router,
    prefix=f"/api/{settings.API_VERSION}"
)

app.include_router(
    health_router,
    prefix=f"/api/{settings.API_VERSION}"
)