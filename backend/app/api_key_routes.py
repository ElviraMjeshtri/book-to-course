"""
User API Key Management Routes
Allows users to store and manage their own API keys for LLM/TTS providers
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .database import get_db
from .models import User, UserAPIKey
from .auth_routes import get_current_user
from .auth_utils import encrypt_api_key, decrypt_api_key

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


# ==================== PYDANTIC MODELS ====================

class APIKeyCreate(BaseModel):
    provider: str  # openai, anthropic, google, mistral, elevenlabs, heygen
    api_key: str


class APIKeyUpdate(BaseModel):
    api_key: str
    is_active: Optional[bool] = None


class APIKeyResponse(BaseModel):
    id: str
    provider: str
    is_active: bool
    masked_key: str  # Show only last 4 characters
    created_at: str

    class Config:
        from_attributes = True


# ==================== HELPER FUNCTIONS ====================

def mask_api_key(encrypted_key: str) -> str:
    """
    Decrypt and mask API key for display
    Shows only last 4 characters: sk-...abc123
    """
    try:
        plain_key = decrypt_api_key(encrypted_key)
        if len(plain_key) > 4:
            return f"{plain_key[:3]}...{plain_key[-4:]}"
        return "***"
    except:
        return "***"


# ==================== ROUTES ====================

@router.get("/", response_model=List[APIKeyResponse])
def list_user_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all API keys for the current user
    """
    api_keys = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id
    ).all()

    return [
        APIKeyResponse(
            id=str(key.id),
            provider=key.provider,
            is_active=key.is_active,
            masked_key=mask_api_key(key.encrypted_key),
            created_at=key.created_at.isoformat()
        )
        for key in api_keys
    ]


@router.post("/", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add or update an API key for a specific provider
    If key exists for provider, it will be updated
    """
    # Validate provider
    valid_providers = ['openai', 'anthropic', 'google', 'mistral', 'elevenlabs', 'heygen', 'google-tts']
    if key_data.provider not in valid_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider. Must be one of: {', '.join(valid_providers)}"
        )

    # Check if key already exists for this provider
    existing_key = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id,
        UserAPIKey.provider == key_data.provider
    ).first()

    if existing_key:
        # Update existing key
        existing_key.encrypted_key = encrypt_api_key(key_data.api_key)
        existing_key.is_active = True
        db.commit()
        db.refresh(existing_key)
        api_key = existing_key
    else:
        # Create new key
        api_key = UserAPIKey(
            user_id=current_user.id,
            provider=key_data.provider,
            encrypted_key=encrypt_api_key(key_data.api_key),
            is_active=True
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

    return APIKeyResponse(
        id=str(api_key.id),
        provider=api_key.provider,
        is_active=api_key.is_active,
        masked_key=mask_api_key(api_key.encrypted_key),
        created_at=api_key.created_at.isoformat()
    )


@router.patch("/{provider}", response_model=APIKeyResponse)
def update_api_key_status(
    provider: str,
    update_data: APIKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update API key or toggle active status for a provider
    """
    api_key = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id,
        UserAPIKey.provider == provider
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No API key found for provider: {provider}"
        )

    # Update fields if provided
    if update_data.api_key:
        api_key.encrypted_key = encrypt_api_key(update_data.api_key)

    if update_data.is_active is not None:
        api_key.is_active = update_data.is_active

    db.commit()
    db.refresh(api_key)

    return APIKeyResponse(
        id=str(api_key.id),
        provider=api_key.provider,
        is_active=api_key.is_active,
        masked_key=mask_api_key(api_key.encrypted_key),
        created_at=api_key.created_at.isoformat()
    )


@router.delete("/{provider}")
def delete_api_key(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an API key for a specific provider
    """
    api_key = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id,
        UserAPIKey.provider == provider
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No API key found for provider: {provider}"
        )

    db.delete(api_key)
    db.commit()

    return {"message": f"API key for {provider} deleted successfully"}


@router.get("/{provider}/decrypt")
def get_decrypted_api_key(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get decrypted API key for a provider (for internal use by LLM/TTS clients)
    """
    api_key = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id,
        UserAPIKey.provider == provider,
        UserAPIKey.is_active == True
    ).first()

    if not api_key:
        return {"api_key": None, "found": False}

    try:
        decrypted_key = decrypt_api_key(api_key.encrypted_key)
        return {"api_key": decrypted_key, "found": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt API key"
        )
