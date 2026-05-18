"""
Recommender service for Bonfire.
Wraps the semantic search engine to provide AI-powered recommendations.
"""

import logging
from pathlib import Path
from typing import List, Optional

from backend.models import Community, CommunityMatch
from .recommender import CommunityIndex

log = logging.getLogger("recommender_service")

# Global index instance
_index: Optional[CommunityIndex] = None


def initialize_recommender(communities_file: Optional[str] = None, device: Optional[str] = None) -> None:
    """
    Initialize the semantic recommender with a communities JSON file.
    
    Args:
        communities_file: Path to the communities JSON file. If None, uses delft_communities_clean.json
        device: torch device to use (cpu, cuda, mps). Auto-detected if None.
    """
    global _index
    
    if communities_file is None:
        # Try to find delft_communities_clean.json
        current_dir = Path(__file__).parent.parent
        communities_file = str(current_dir / "data" / "delft_communities_clean.json")
    
    try:
        log.info(f"Initializing semantic recommender with: {communities_file}")
        _index = CommunityIndex(device=device).load(communities_file)
        log.info(f"Recommender initialized successfully. Index size: {len(_index.communities)}")
    except Exception as e:
        log.error(f"Failed to initialize recommender: {e}")
        _index = None


def is_recommender_ready() -> bool:
    """Check if the recommender index is loaded and ready."""
    return _index is not None and _index.embeddings is not None and len(_index.embeddings) > 0


def get_recommendations(
    user_interests: str,
    communities: List[Community],
    limit: int = 5
) -> List[CommunityMatch]:
    """
    Get semantic recommendations for user interests.
    
    Args:
        user_interests: Free-form user interests (e.g., "board games and bouldering")
        communities: List of communities to filter (usually filtered by city)
        limit: Maximum number of recommendations to return
    
    Returns:
        List of CommunityMatch objects ranked by relevance
    """
    if not is_recommender_ready():
        log.warning("Recommender not initialized. Falling back to basic matching.")
        return _fallback_basic_matching(user_interests, communities, limit)
    
    try:
        # Get IDs of top-N matches from semantic search
        matched_ids = _index.search(user_interests, top_n=limit * 2)  # Get extra to account for filtering
        
        # Build a lookup map of communities by ID
        community_map = {c.id: c for c in communities}
        
        # Convert matched IDs to CommunityMatch objects, filtering by availability
        recommendations = []
        for matched_id in matched_ids:
            if matched_id in community_map:
                community = community_map[matched_id]
                recommendation = CommunityMatch(
                    id=community.id,
                    name=community.name,
                    category=community.category,
                    city=community.city,
                    description_short=community.description_short,
                    description_full=community.description_full,
                    match_reason=f"Matches your interests in {community.category}.",
                    website_url=community.website_url,
                    contact_email=community.contact_email,
                    image_url=community.image_url,
                    estimated_annual_fee_eur=community.estimated_annual_fee_eur,
                    is_university_affiliated=community.is_university_affiliated,
                    relevance_score=1.0  # Semantic search already ranked these
                )
                recommendations.append(recommendation)
                
                if len(recommendations) >= limit:
                    break
        
        if not recommendations:
            log.warning(f"No recommendations found for: {user_interests}")
            return _fallback_basic_matching(user_interests, communities, limit)
        
        return recommendations
    
    except Exception as e:
        log.error(f"Error generating recommendations: {e}")
        return _fallback_basic_matching(user_interests, communities, limit)


def _fallback_basic_matching(
    user_interests: str,
    communities: List[Community],
    limit: int = 5
) -> List[CommunityMatch]:
    """
    Fallback: basic keyword/category matching when semantic search is unavailable.
    
    Args:
        user_interests: Free-form user interests
        communities: List of communities to filter
        limit: Maximum number of recommendations to return
    
    Returns:
        List of CommunityMatch objects sorted by relevance
    """
    interests_lower = user_interests.lower()
    scored_communities = []
    
    for community in communities:
        score = 0.0
        
        # Check for matches in category (highest weight)
        if community.category and community.category.lower() in interests_lower:
            score += 0.5
        
        # Check for matches in tags
        if community.tags:
            for tag in community.tags:
                if tag.lower() in interests_lower:
                    score += 0.15
        
        # Check for matches in community name
        if community.name.lower() in interests_lower:
            score += 0.3
        
        # Only include communities with some relevance
        if score > 0:
            scored_communities.append((community, score))
    
    # Sort by score (descending) and take top N
    scored_communities.sort(key=lambda x: x[1], reverse=True)
    
    recommendations = []
    for community, score in scored_communities[:limit]:
        recommendation = CommunityMatch(
            id=community.id,
            name=community.name,
            category=community.category,
            city=community.city,
            description_short=community.description_short,
            description_full=community.description_full,
            match_reason=f"Matches your interest in {community.category}.",
            website_url=community.website_url,
            contact_email=community.contact_email,
            image_url=community.image_url,
            estimated_annual_fee_eur=community.estimated_annual_fee_eur,
            is_university_affiliated=community.is_university_affiliated,
            relevance_score=min(score, 1.0)
        )
        recommendations.append(recommendation)
    
    return recommendations
