"""
Storage service for thread-safe JSON read/write operations.
Handles persistence of communities data to local JSON files.
"""

import json
import os
from typing import List, Optional
from threading import Lock
from pathlib import Path

from backend.models import Community


# Thread lock for safe concurrent access to JSON files
json_lock = Lock()


def get_communities_path() -> str:
    """
    Get the absolute path to the communities JSON file.

    Honours the ``BONFIRE_COMMUNITIES_PATH`` environment variable when set,
    so the backend can be pointed at any compatible dataset. Defaults to
    ``backend/data/communities.json``.
    """
    override = os.environ.get("BONFIRE_COMMUNITIES_PATH")
    if override:
        return override
    current_dir = Path(__file__).parent.parent
    return os.path.join(current_dir, "data", "communities.json")


def load_communities() -> List[Community]:
    """
    Thread-safely load all communities from the JSON file.
    
    Returns:
        List of Community objects.
    """
    with json_lock:
        try:
            communities_path = get_communities_path()
            if not os.path.exists(communities_path):
                return []
            
            with open(communities_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Parse JSON into Community objects
            communities = [Community(**item) for item in data]
            return communities
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error loading communities: {e}")
            return []


def save_communities(communities: List[Community]) -> None:
    """
    Thread-safely save communities to the JSON file.
    
    Args:
        communities: List of Community objects to persist.
    """
    with json_lock:
        try:
            communities_path = get_communities_path()
            os.makedirs(os.path.dirname(communities_path), exist_ok=True)
            
            # Convert Community objects to dictionaries
            data = [c.model_dump() for c in communities]
            
            with open(communities_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving communities: {e}")


def add_community(community: Community) -> None:
    """
    Add a new community to the database.
    
    Args:
        community: Community object to add.
    """
    communities = load_communities()
    # Check for duplicates by ID
    if any(c.id == community.id for c in communities):
        print(f"Community with ID {community.id} already exists.")
        return
    communities.append(community)
    save_communities(communities)


def get_community_by_id(community_id: str) -> Optional[Community]:
    """
    Retrieve a community by its ID.
    
    Args:
        community_id: The ID of the community to retrieve.
    
    Returns:
        Community object if found, None otherwise.
    """
    communities = load_communities()
    for community in communities:
        if community.id == community_id:
            return community
    return None


def get_communities_by_location(location: str) -> List[Community]:
    """
    Retrieve all communities in a specific location.
    
    Args:
        location: The city name (e.g., "Delft", "Rotterdam", "Den Haag").
    
    Returns:
        List of Community objects in the specified location.
    """
    communities = load_communities()
    return [c for c in communities if c.city.lower() == location.lower()]


def get_communities_by_niche(niche: str) -> List[Community]:
    """
    Retrieve all communities with a specific category.
    
    Args:
        niche: The category to filter by.
    
    Returns:
        List of Community objects matching the category.
    """
    communities = load_communities()
    return [c for c in communities if c.category.lower() == niche.lower()]


def delete_community(community_id: str) -> bool:
    """
    Delete a community by its ID.
    
    Args:
        community_id: The ID of the community to delete.
    
    Returns:
        True if deletion was successful, False otherwise.
    """
    communities = load_communities()
    original_length = len(communities)
    communities = [c for c in communities if c.id != community_id]
    
    if len(communities) < original_length:
        save_communities(communities)
        return True
    return False
