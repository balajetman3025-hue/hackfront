import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.core.database import init_db
from app.core.neo4j_client import neo4j_manager
from app.core.redis_client import redis_manager

from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.device_profiles import router as device_profiles_router
from app.api.v1.tests_web import router as tests_web_router
from app.api.v1.tests_android import router as tests_android_router
from app.api.v1.comparisons import router as comparisons_router
from app.api.v1.graph import router as graph_router
from app.api.v1.rca import router as rca_router
from app.api.v1.system import router as system_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("tierlens")


# =====================================================================
# Middleware: Security Headers & CSP
# =====================================================================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Allow Swagger UI / ReDoc to load CDN assets
        path = request.url.path
        if path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi.json"):
            csp_policy = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "connect-src 'self' https:;"
            )
        else:
            # API & Artifacts CSP Policy
            csp_policy = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https: blob:; "
                "font-src 'self' data:; "
                "connect-src 'self' https://hackfront-plum.vercel.app https://hackfront-ckpg.onrender.com https:; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "frame-ancestors 'none';"
            )

        # Security Headers matching your vercel.json specification
        response.headers["Content-Security-Policy"] = csp_policy
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["X-DNS-Prefetch-Control"] = "off"
        response.headers["X-XSS-Protection"] = "0"
        # Crucial for cross-origin API and artifact downloads:
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

        return response


# =====================================================================
# Middleware: Performance / Latency Timing
# =====================================================================
class ProcessTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response


# =====================================================================
# Application Lifespan
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting TierLens Platform...")

    # In production, validate PostgreSQL database connectivity before proceeding
    if settings.ENVIRONMENT == "production" or settings.DATABASE_MODE == "postgres_required":
        logger.info(f"Validating production PostgreSQL connectivity against: {settings.get_masked_database_url()}")
        try:
            from sqlalchemy import text
            from app.core.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            logger.info("Production PostgreSQL connectivity verified successfully.")
        except Exception as e:
            logger.error(f"Production database connectivity check failed: {e}")
            raise RuntimeError(
                f"Production database connection error: Unable to connect to PostgreSQL at "
                f"{settings.get_masked_database_url()}. Ensure DATABASE_URL is correct and the database is accessible."
            ) from e

    await init_db()
    logger.info("Database schema initialized.")

    # Reconcile any orphaned RUNNING test runs left by prior unexpected server shutdowns
    try:
        from app.models.relational.entities import TestRun, TestStatus
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import update
        async with AsyncSessionLocal() as session:
            stmt = (
                update(TestRun)
                .where(TestRun.status == TestStatus.RUNNING.value)
                .values(
                    status=TestStatus.FAILED.value,
                    failure_summary="Test interrupted by backend restart."
                )
            )
            await session.execute(stmt)
            await session.commit()
    except Exception as e:
        logger.warning(f"Startup zombie run reconciliation noticed: {e}")

    yield
    # Shutdown
    logger.info("Shutting down TierLens Platform...")
    await neo4j_manager.close()
    await redis_manager.close()


app = FastAPI(
    title="TierLens API",
    description="Application Performance & Device Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan
)

# =====================================================================
# Middleware Stack (Execution order: Top to Bottom)
# =====================================================================

# 1. CORS Middleware (Applied outermost to ensure headers exist on all responses and preflight OPTIONS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hackfront-plum.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Process-Time"],
)

# 2. Security Headers & CSP Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 3. Process Time Latency Middleware
app.add_middleware(ProcessTimeMiddleware)


# =====================================================================
# Static Files & Routes
# =====================================================================
os.makedirs(settings.ARTIFACTS_DIR, exist_ok=True)
app.mount("/artifacts", StaticFiles(directory=settings.ARTIFACTS_DIR), name="artifacts")

# Register API Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(device_profiles_router, prefix="/api/v1")
app.include_router(tests_web_router, prefix="/api/v1")
app.include_router(tests_android_router, prefix="/api/v1")
app.include_router(comparisons_router, prefix="/api/v1")
app.include_router(graph_router, prefix="/api/v1")
app.include_router(rca_router, prefix="/api/v1")
app.include_router(system_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "platform": "TierLens Application Performance & Device Intelligence",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/api/v1/system/health"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "TierLens Backend"}
