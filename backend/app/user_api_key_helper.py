"""
Helper functions to get user-specific API keys
Falls back to system-wide keys from environment variables
"""
import os
from typing import Optional
from sqlalchemy.orm import Session
from .models import UserAPIKey
from .auth_utils import decrypt_api_key


def get_user_api_key(db: Session, user_id: str, provider: str) -> Optional[str]:
    """
    Get API key for a user and provider
    Priority:
    1. User's encrypted API key in database
    2. System-wide API key from environment variables

    Args:
        db: Database session
        user_id: User UUID
        provider: Provider name (openai, anthropic, google, etc.)

    Returns:
        Decrypted API key or None
    """
    # Try to get user's API key
    user_key = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == user_id,
        UserAPIKey.provider == provider,
        UserAPIKey.is_active == True
    ).first()

    if user_key:
        try:
            return decrypt_api_key(user_key.encrypted_key)
        except Exception as e:
            print(f"Error decrypting user API key for {provider}: {e}")

    # Fallback to environment variable
    env_key_map = {
        'openai': 'OPENAI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'google': 'GOOGLE_AI_API_KEY',
        'mistral': 'MISTRAL_API_KEY',
        'elevenlabs': 'ELEVENLABS_API_KEY',
        'heygen': 'HEYGEN_API_KEY',
        'google-tts': 'GOOGLE_APPLICATION_CREDENTIALS'
    }

    env_var = env_key_map.get(provider)
    if env_var:
        return os.getenv(env_var)

    return None


def get_user_model_config(db: Session, user_id: str, service_type: str = 'llm') -> dict:
    """
    Get user's preferred model configuration

    Args:
        db: Database session
        user_id: User UUID
        service_type: 'llm' or 'tts'

    Returns:
        Dict with provider, model, and api_key
    """
    # TODO: Add UserModelConfig table to store user preferences
    # For now, return defaults

    if service_type == 'llm':
        provider = 'openai'
        model = 'gpt-4-turbo-preview'
    else:  # tts
        provider = 'elevenlabs'
        model = 'eleven_multilingual_v2'

    api_key = get_user_api_key(db, user_id, provider)

    return {
        'provider': provider,
        'model': model,
        'api_key': api_key
    }
