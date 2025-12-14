"""
Configuration management for AI models and API keys
Supports OpenAI, Anthropic, and Google Gemini
"""
import os
from typing import Dict, Any, Optional, Literal
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# Provider types
Provider = Literal["openai", "anthropic", "gemini"]

# Model definitions
AVAILABLE_MODELS: Dict[Provider, Dict[str, Dict[str, Any]]] = {
    "openai": {
        "gpt-4o-mini": {
            "name": "GPT-4o Mini",
            "description": "Fast and efficient - Best for testing",
            "cost": "Low",
            "speed": "Fast",
        },
        "gpt-4o": {
            "name": "GPT-4o",
            "description": "High quality - Balanced performance",
            "cost": "Medium",
            "speed": "Medium",
        },
        "gpt-4-turbo": {
            "name": "GPT-4 Turbo",
            "description": "Most capable - Best quality",
            "cost": "High",
            "speed": "Medium",
        },
    },
    "anthropic": {
        "claude-3-5-haiku-20241022": {
            "name": "Claude 3.5 Haiku",
            "description": "Fast and efficient - Best for testing",
            "cost": "Low",
            "speed": "Very Fast",
        },
        "claude-3-5-sonnet-20241022": {
            "name": "Claude 3.5 Sonnet",
            "description": "High quality - Best balance",
            "cost": "Medium",
            "speed": "Fast",
        },
        "claude-3-opus-20240229": {
            "name": "Claude 3 Opus",
            "description": "Most capable - Best quality",
            "cost": "High",
            "speed": "Medium",
        },
    },
    "gemini": {
        "gemini-1.5-flash": {
            "name": "Gemini 1.5 Flash",
            "description": "Fast and efficient - Best for testing",
            "cost": "Low",
            "speed": "Very Fast",
        },
        "gemini-1.5-pro": {
            "name": "Gemini 1.5 Pro",
            "description": "High quality - Best balance",
            "cost": "Medium",
            "speed": "Fast",
        },
        "gemini-1.0-pro": {
            "name": "Gemini 1.0 Pro",
            "description": "Baseline model",
            "cost": "Low",
            "speed": "Fast",
        },
    },
}


class ModelConfig(BaseModel):
    """Configuration for a specific AI model"""
    provider: Provider
    model: str
    api_key: str


class AppConfig:
    """
    Application-wide configuration for AI models
    Singleton pattern - holds current runtime configuration
    """
    _instance: Optional["AppConfig"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Initialize from environment variables (fallback)
        self._current_provider: Provider = "openai"
        self._current_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        # API keys - initially from .env
        self._api_keys: Dict[Provider, Optional[str]] = {
            "openai": os.getenv("OPENAI_API_KEY"),
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "gemini": os.getenv("GEMINI_API_KEY"),
        }

        self._initialized = True

    def get_current_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return {
            "provider": self._current_provider,
            "model": self._current_model,
            "model_info": AVAILABLE_MODELS.get(self._current_provider, {}).get(
                self._current_model, {}
            ),
            "has_api_key": bool(self._api_keys.get(self._current_provider)),
        }

    def get_available_models(self) -> Dict[str, Any]:
        """Get all available models grouped by provider"""
        result = {}
        for provider, models in AVAILABLE_MODELS.items():
            result[provider] = {
                "name": provider.title(),
                "has_api_key": bool(self._api_keys.get(provider)),
                "models": models,
            }
        return result

    def update_config(
        self,
        provider: Provider,
        model: str,
        api_key: Optional[str] = None
    ) -> bool:
        """
        Update the current configuration

        Args:
            provider: AI provider (openai, anthropic, gemini)
            model: Model ID
            api_key: Optional API key (if not provided, uses existing)

        Returns:
            True if successful, False otherwise
        """
        # Validate provider
        if provider not in AVAILABLE_MODELS:
            raise ValueError(f"Invalid provider: {provider}")

        # Validate model
        if model not in AVAILABLE_MODELS[provider]:
            raise ValueError(f"Invalid model for {provider}: {model}")

        # Update API key if provided
        if api_key:
            self._api_keys[provider] = api_key

        # Check if we have an API key for this provider
        if not self._api_keys.get(provider):
            raise ValueError(f"No API key configured for {provider}")

        # Update current configuration
        self._current_provider = provider
        self._current_model = model

        return True

    def get_api_key(self, provider: Optional[Provider] = None) -> Optional[str]:
        """Get API key for a provider (defaults to current provider)"""
        if provider is None:
            provider = self._current_provider
        return self._api_keys.get(provider)

    def set_api_key(self, provider: Provider, api_key: str) -> None:
        """Set API key for a provider"""
        if provider not in AVAILABLE_MODELS:
            raise ValueError(f"Invalid provider: {provider}")
        self._api_keys[provider] = api_key

    @property
    def provider(self) -> Provider:
        """Current provider"""
        return self._current_provider

    @property
    def model(self) -> str:
        """Current model"""
        return self._current_model

    @property
    def api_key(self) -> Optional[str]:
        """Current API key"""
        return self._api_keys.get(self._current_provider)


# Singleton instance
config = AppConfig()