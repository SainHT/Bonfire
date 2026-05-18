"""
FastAPI routes for the Bonfire backend.
Handles endpoints for community recommendations and data management.
Uses semantic search via the integrated recommender engine.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from backend.models import RecommendationRequest, RecommendationResponse
from backend.services import storage_service, recommender_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint, including recommender readiness."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "recommender": {
            "ready": recommender_service.is_recommender_ready(),
            "mode": "semantic" if recommender_service.is_recommender_ready() else "fallback_keyword",
        },
    }


@router.get("/recommender/status")
async def recommender_status():
    """
    Detailed status for the AI recommender engine.
    Useful for verifying whether semantic search is live or the basic fallback is in use.
    """
    ready = recommender_service.is_recommender_ready()
    return {
        "ready": ready,
        "mode": "semantic" if ready else "fallback_keyword",
        "endpoint": "POST /api/recommend",
        "example_payload": {
            "city": "Delft",
            "interests": "board games and bouldering",
            "limit": 5,
        },
    }


@router.post("/recommend", response_model=RecommendationResponse)
async def recommend_communities(request: RecommendationRequest):
    """
    Main recommendation endpoint.
    Matches user interests with available communities using semantic search.
    
    Args:
        request: RecommendationRequest with city and interests
    
    Returns:
        RecommendationResponse with matched communities ranked by relevance
    """
    
    # Validate city
    valid_cities = ["Delft", "Den Haag", "Rotterdam"]
    if request.city not in valid_cities:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid city. Must be one of: {', '.join(valid_cities)}"
        )
    
    # Get communities in the user's city
    candidate_communities = storage_service.get_communities_by_location(request.city)
    
    if not candidate_communities:
        raise HTTPException(
            status_code=404,
            detail=f"No communities found in {request.city}"
        )
    
    # Use semantic recommender to generate recommendations
    recommendations = recommender_service.get_recommendations(
        user_interests=request.interests,
        communities=candidate_communities,
        limit=request.limit
    )
    
    # Build response
    response = RecommendationResponse(
        user_input=request.interests,
        city=request.city,
        recommendations=recommendations,
        total_count=len(recommendations),
        generated_at=datetime.now().isoformat()
    )
    
    return response


@router.get("/communities")
async def get_all_communities(city: str = Query(None), limit: int = Query(100, ge=1, le=1000)):
    """
    Get all communities, optionally filtered by city.
    
    Args:
        city: Optional city filter (Delft, Rotterdam, Den Haag)
        limit: Maximum number of results
    
    Returns:
        List of communities
    """
    
    if city:
        communities = storage_service.get_communities_by_location(city)
    else:
        communities = storage_service.load_communities()
    
    return {
        "total": len(communities),
        "communities": communities[:limit]
    }


@router.get("/communities/{community_id}")
async def get_community(community_id: str):
    """
    Get a specific community by ID.
    
    Args:
        community_id: The community's unique identifier
    
    Returns:
        Community object
    """
    
    community = storage_service.get_community_by_id(community_id)
    
    if not community:
        raise HTTPException(
            status_code=404,
            detail=f"Community with ID '{community_id}' not found"
        )
    
    return community


@router.get("/niches")
async def get_available_niches():
    """
    Get all unique categories available.
    
    Returns:
        List of available categories
    """
    
    communities = storage_service.load_communities()
    categories = sorted(list(set(c.category for c in communities)))
    
    return {
        "total": len(categories),
        "categories": categories
    }


@router.get("/cities")
async def get_available_cities():
    """
    Get all cities with communities.
    
    Returns:
        List of cities
    """
    
    communities = storage_service.load_communities()
    cities = sorted(list(set(c.city for c in communities)))
    
    return {
        "total": len(cities),
        "cities": cities
    }


@router.post("/communities")
async def create_community(community_data: dict):
    """
    Add a new community to the database.
    
    Args:
        community_data: Dictionary with community information
    
    Returns:
        Success message
    """
    
    try:
        from backend.models import Community
        community = Community(**community_data)
        storage_service.add_community(community)
        return {
            "status": "success",
            "message": f"Community '{community.name}' added successfully",
            "community_id": community.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error creating community: {str(e)}"
        )


@router.delete("/communities/{community_id}")
async def delete_community(community_id: str):
    """
    Delete a community by ID.
    
    Args:
        community_id: The community's unique identifier
    
    Returns:
        Success message
    """
    
    success = storage_service.delete_community(community_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Community with ID '{community_id}' not found"
        )
    
    return {
        "status": "success",
        "message": f"Community '{community_id}' deleted successfully"
    }
