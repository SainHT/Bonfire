"""
Main FastAPI application for Bonfire backend.
Entry point for the community discovery and recommendation engine.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from services import recommender_service

# Import routes
from api.routes import router as api_router


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
    print("  - POST /recommend - Get community recommendations")
    print("  - GET /communities - List all communities")
    print("  - GET /communities/{id} - Get specific community")
    print("  - GET /niches - Available community types")
    print("  - GET /cities - Available cities")
    print("  - GET /health - Health check")
    
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


# Configure CORS for development (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
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
            "recommend": "POST /api/recommend"
        }
    }


# If running as main, start the server
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
