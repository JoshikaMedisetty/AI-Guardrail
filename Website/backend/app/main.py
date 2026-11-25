import os
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings
from app.api.routes import router as api_v1_router
from app.api.auth import router as auth_router
from app.database.session import engine, Base, ensure_schema_migrations
from app.database.seeder import seed_database
from app.ml.model_manager import model_manager
from app.utils.logger import logger

# Initialize database schema & seed initial data
try:
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations()
    seed_database()
    logger.info("Database schema initialized and seeded successfully.")
except Exception as e:
    logger.warning(f"Database initialization notice: {e}")

# Startup check for ML Model & Vectorizer
try:
    status_info = model_manager.get_status()
    if status_info["model_status"] == "READY":
        logger.info(f"ML Security Pipeline: Linear SVM model and TF-IDF vectorizer ready ({status_info['classes']} classes).")
    else:
        logger.warning(f"ML Security Pipeline: ML model unavailable ({status_info['detail']}).")
except Exception as e:
    logger.warning(f"ML Model startup notice: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0-production",
    description="""
# 🛡️ Universal AI Guardrail API & Full-Stack Platform

Agent-independent security middleware layer protecting Large Language Models (LLMs) against Prompt Injections, Jailbreaks, System Prompt Extraction, and Data Exfiltration in real time.

### Architecture Highlights:
* **Real-time Dual Pipeline**: Input Guardrail (Rule + Linear SVM Ensemble) and Output Guardrail (Secret, PII & System Prompt Leakage check).
* **Multi-Agent Ecosystem**: General Assistant, Coding, Travel, Finance, Research, Banking, Shopping agents.
* **Persistent SQLite Database**: Real-time event telemetry, user authentication, and immutable audit logging.
    """,
    openapi_tags=[
        {"name": "Guardrail", "description": "Core Input & Output inspection and policy enforcement endpoints."},
        {"name": "Chat", "description": "Multi-agent conversational endpoints with active guardrail mediation."},
        {"name": "Agents", "description": "Protected agents directory and registration."},
        {"name": "Dashboard", "description": "Live security telemetry, metrics, and incident stream."},
        {"name": "Authentication", "description": "User registration, login, and JWT session verification."},
        {"name": "History", "description": "Immutable audit ledger and past conversation history."},
        {"name": "Analytics", "description": "Threat category distribution and model benchmarks."},
        {"name": "Configuration", "description": "Dynamic threshold and protection policy engine."},
        {"name": "System", "description": "Health, metadata, and operational status."}
    ]
)

# CORS Configuration for development and multi-port setups
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# 1. Mount FastAPI API Routes
# --------------------------------------------------------------------------
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix="/api")  # Support both /api/auth and /api/v1/auth

# --------------------------------------------------------------------------
# 2. Mount Static Files & SPA Routing for Unified Single-Website Server
# --------------------------------------------------------------------------
# Calculate paths to frontend dist
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"

# Mount /assets static directory if dist exists
if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

@app.get("/", tags=["Website"])
async def serve_root():
    """Serve the single-page React frontend application."""
    if FRONTEND_INDEX.exists():
        return FileResponse(str(FRONTEND_INDEX))
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0-production",
        "status": "ACTIVE",
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "message": "Frontend build not generated yet. Run 'npm run build' in frontend directory."
    }

@app.get("/{full_path:path}", tags=["Website"])
async def serve_spa_fallback(full_path: str):
    """
    SPA Fallback Route:
    - Direct static files from dist (e.g. vite.svg, favicon.ico) are returned if present.
    - All non-API frontend routes (e.g. /login, /agents, /chat/coding-agent, /dashboard) return index.html.
    - Unmatched /api routes return a clean JSON 404.
    """
    # Guard against intercepting docs, openapi, or missing API routes
    if full_path.startswith("api/") or full_path == "api":
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not Found", "detail": f"API endpoint '/{full_path}' not found"}
        )
    
    if full_path in ["docs", "redoc", "openapi.json"]:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Not found"}
        )

    # Check if a direct static file exists in frontend/dist
    direct_file = FRONTEND_DIST / full_path
    if direct_file.is_file():
        return FileResponse(str(direct_file))

    # Fallback to SPA index.html for React Router
    if FRONTEND_INDEX.exists():
        return FileResponse(str(FRONTEND_INDEX))

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": f"Resource '/{full_path}' not found."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
