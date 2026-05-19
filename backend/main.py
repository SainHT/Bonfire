"""
Main FastAPI application for Bonfire backend.
Entry point for the community discovery and recommendation engine.
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Support direct execution: python backend/main.py
if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router as api_router
from backend.services import recommender_service


def _parse_cors_origins(raw: str | None) -> list[str]:
    """Comma-separated origin list. '*' (default) means allow everyone."""
    if not raw:
        return ["*"]
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return parts or ["*"]


_CORS_ORIGINS = _parse_cors_origins(os.environ.get("BONFIRE_CORS_ORIGINS"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for app startup/shutdown events.
    """
    # Startup
    print("🔥 Bonfire Backend Starting Up...")
    
    # Initialize the semantic recommender
    print("🤖 Initializing semantic recommender engine...")
    recommender_service.initialize_recommender()
    if recommender_service.is_recommender_ready():
        print("✅ Recommender engine ready!")
    else:
        print("⚠️  Recommender engine not ready - will fall back to basic matching")
    
    print("📍 Available endpoints:")
    print("  - POST /api/recommend       - AI recommender (semantic search)")
    print("  - GET  /api/communities     - List all communities")
    print("  - GET  /api/communities/{id}- Get specific community")
    print("  - GET  /api/niches          - Available community types")
    print("  - GET  /api/cities          - Available cities")
    print("  - GET  /api/health          - Health check")
    print("  - GET  /docs                - Interactive API docs (Swagger UI)")
    print("  - GET  /openapi.json        - OpenAPI schema")
    
    yield
    
    # Shutdown
    print("\n🔥 Bonfire Backend Shutting Down...")


# Initialize FastAPI app
app = FastAPI(
    title="Bonfire API",
    description="Community Discovery Platform for Urban Loneliness",
    version="0.1.0",
    lifespan=lifespan
)


# CORS: wildcard for dev, explicit allow-list for production via
# BONFIRE_CORS_ORIGINS (comma-separated). Credentials must be off when using
# a wildcard, otherwise the browser rejects the response.
_allow_credentials = _CORS_ORIGINS != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API routes
app.include_router(api_router, prefix="/api", tags=["communities"])


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Bonfire API",
        "mission": "Combat urban loneliness through interest-based community discovery",
        "version": "0.1.0",
        "endpoints": {
            "docs": "/docs",
            "openapi": "/openapi.json",
            "health": "/api/health",
            "ai_recommender": "POST /api/recommend",
            "ai_recommender_status": "GET /api/recommender/status",
            "communities": "GET /api/communities",
            "niches": "GET /api/niches",
            "cities": "GET /api/cities",
        },
        "ai_recommender_example": {
            "method": "POST",
            "url": "/api/recommend",
            "body": {
                "city": "Delft",
                "interests": "board games and bouldering",
                "limit": 5,
            },
        },
    }


# If running as main, start the server
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
