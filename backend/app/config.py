"""
Configuration management for AI models, TTS, and API keys
Supports: OpenAI, Anthropic, Google Gemini, DeepSeek, Mistral AI
TTS: OpenAI, ElevenLabs, Google Cloud TTS
"""
import os
from typing import Dict, Any, Optional, Literal
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# Provider types
LLMProvider = Literal["openai", "anthropic", "gemini", "deepseek", "mistral"]
TTSProvider = Literal["openai", "elevenlabs", "google_tts"]

# LLM Model definitions
AVAILABLE_MODELS: Dict[LLMProvider, Dict[str, Dict[str, Any]]] = {
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
            "description": "Powerful - High quality",
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
            "description": "High quality - Best balance (Recommended)",
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
        "gemini-2.0-flash-exp": {
            "name": "Gemini 2.0 Flash (Experimental)",
            "description": "Newest - Fast and powerful (Recommended)",
            "cost": "Low",
            "speed": "Very Fast",
        },
        "gemini-exp-1206": {
            "name": "Gemini Experimental 1206",
            "description": "Experimental - Latest features",
            "cost": "Low",
            "speed": "Fast",
        },
        "gemini-1.5-flash": {
            "name": "Gemini 1.5 Flash",
            "description": "Fast and efficient - Stable",
            "cost": "Low",
            "speed": "Very Fast",
        },
        "gemini-1.5-pro": {
            "name": "Gemini 1.5 Pro",
            "description": "High quality - Best balance",
            "cost": "Medium",
            "speed": "Fast",
        },
    },
    "deepseek": {
        "deepseek-chat": {
            "name": "DeepSeek Chat",
            "description": "Very cheap - Surprisingly good quality",
            "cost": "Very Low",
            "speed": "Fast",
        },
    },
    "mistral": {
        "mistral-large-latest": {
            "name": "Mistral Large",
            "description": "Most capable - High quality",
            "cost": "Medium",
            "speed": "Fast",
        },
        "mistral-small-latest": {
            "name": "Mistral Small",
            "description": "Fast and efficient - Good balance",
            "cost": "Low",
            "speed": "Very Fast",
        },
    },
}

# TTS Provider definitions
AVAILABLE_TTS: Dict[TTSProvider, Dict[str, Any]] = {
    "openai": {
        "name": "OpenAI TTS",
        "description": "High quality, natural voices",
        "cost": "$15/1M chars",
        "models": {
            "tts-1": {
                "name": "Standard",
                "description": "Fast, good quality",
            },
            "tts-1-hd": {
                "name": "HD",
                "description": "High quality, slower",
            },
        },
        "voices": {
            "alloy": "Neutral",
            "echo": "Male",
            "fable": "British Male",
            "onyx": "Deep Male",
            "nova": "Female",
            "shimmer": "Soft Female",
        },
    },
    "elevenlabs": {
        "name": "ElevenLabs",
        "description": "Premium quality, most realistic",
        "cost": "$30/month + usage",
        "models": {
            "eleven_monolingual_v1": {
                "name": "Monolingual V1",
                "description": "English only, fast",
            },
            "eleven_multilingual_v2": {
                "name": "Multilingual V2",
                "description": "Multiple languages, best quality",
            },
        },
        "voices": {
            # Will be fetched dynamically from API
            "21m00Tcm4TlvDq8ikWAM": "Rachel - Female",
            "AZnzlk1XvdvUeBnXmlld": "Domi - Female",
            "EXAVITQu4vr4xnSDxMaL": "Bella - Female",
            "ErXwobaYiN019PkySvjV": "Antoni - Male",
            "MF3mGyEYCl7XYWbV9V6O": "Elli - Female",
            "TxGEqnHWrfWFTfGW9XjX": "Josh - Male",
            "VR6AewLTigWG4xSOukaG": "Arnold - Male",
            "pNInz6obpgDQGcFmaJgB": "Adam - Male",
        },
    },
    "google_tts": {
        "name": "Google Cloud TTS",
        "description": "Reliable, many languages",
        "cost": "$4-16/1M chars",
        "models": {
            "standard": {
                "name": "Standard",
                "description": "Basic quality",
            },
            "wavenet": {
                "name": "WaveNet",
                "description": "High quality",
            },
            "neural2": {
                "name": "Neural2",
                "description": "Best quality",
            },
        },
        "voices": {
            "en-US-Standard-A": "US English - Female",
            "en-US-Standard-B": "US English - Male",
            "en-US-Standard-C": "US English - Female",
            "en-US-Standard-D": "US English - Male",
            "en-US-Wavenet-A": "US English - Female (WaveNet)",
            "en-US-Wavenet-B": "US English - Male (WaveNet)",
            "en-US-Neural2-A": "US English - Female (Neural)",
            "en-US-Neural2-C": "US English - Male (Neural)",
        },
    },
}


class ModelConfig(BaseModel):
    """Configuration for a specific AI model"""
    provider: LLMProvider
    model: str
    api_key: str


class TTSConfig(BaseModel):
    """Configuration for TTS"""
    provider: TTSProvider
    model: str
    voice: str
    api_key: Optional[str] = None


class AppConfig:
    """
    Application-wide configuration for AI models and TTS
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

        # Initialize LLM from environment variables (fallback)
        self._current_llm_provider: LLMProvider = "openai"
        self._current_llm_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        # Initialize TTS from environment variables (fallback)
        self._current_tts_provider: TTSProvider = "openai"
        self._current_tts_model: str = "tts-1"
        self._current_tts_voice: str = "alloy"

        # API keys - initially from .env
        self._llm_api_keys: Dict[LLMProvider, Optional[str]] = {
            "openai": os.getenv("OPENAI_API_KEY"),
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "gemini": os.getenv("GEMINI_API_KEY"),
            "deepseek": os.getenv("DEEPSEEK_API_KEY"),
            "mistral": os.getenv("MISTRAL_API_KEY"),
        }

        self._tts_api_keys: Dict[TTSProvider, Optional[str]] = {
            "openai": os.getenv("OPENAI_API_KEY"),  # Reuse from LLM
            "elevenlabs": os.getenv("ELEVENLABS_API_KEY"),
            "google_tts": os.getenv("GOOGLE_TTS_API_KEY"),
        }

        self._initialized = True

    # ========================================================================
    # LLM Configuration Methods
    # ========================================================================

    def get_current_llm_config(self) -> Dict[str, Any]:
        """Get current LLM configuration"""
        return {
            "provider": self._current_llm_provider,
            "model": self._current_llm_model,
            "model_info": AVAILABLE_MODELS.get(self._current_llm_provider, {}).get(
                self._current_llm_model, {}
            ),
            "has_api_key": bool(self._llm_api_keys.get(self._current_llm_provider)),
        }

    def get_available_llm_models(self) -> Dict[str, Any]:
        """Get all available LLM models grouped by provider"""
        result = {}
        for provider, models in AVAILABLE_MODELS.items():
            result[provider] = {
                "name": provider.title(),
                "has_api_key": bool(self._llm_api_keys.get(provider)),
                "models": models,
            }
        return result

    def update_llm_config(
        self,
        provider: LLMProvider,
        model: str,
        api_key: Optional[str] = None
    ) -> bool:
        """Update LLM configuration"""
        # Validate provider
        if provider not in AVAILABLE_MODELS:
            raise ValueError(f"Invalid provider: {provider}")

        # Validate model
        if model not in AVAILABLE_MODELS[provider]:
            raise ValueError(f"Invalid model for {provider}: {model}")

        # Update API key if provided
        if api_key:
            self._llm_api_keys[provider] = api_key

        # Check if we have an API key for this provider
        if not self._llm_api_keys.get(provider):
            raise ValueError(f"No API key configured for {provider}")

        # Update current configuration
        self._current_llm_provider = provider
        self._current_llm_model = model

        return True

    def get_llm_api_key(self, provider: Optional[LLMProvider] = None) -> Optional[str]:
        """Get API key for an LLM provider (defaults to current provider)"""
        if provider is None:
            provider = self._current_llm_provider
        return self._llm_api_keys.get(provider)

    def set_llm_api_key(self, provider: LLMProvider, api_key: str) -> None:
        """Set API key for an LLM provider"""
        if provider not in AVAILABLE_MODELS:
            raise ValueError(f"Invalid provider: {provider}")
        self._llm_api_keys[provider] = api_key

    # ========================================================================
    # TTS Configuration Methods
    # ========================================================================

    def get_current_tts_config(self) -> Dict[str, Any]:
        """Get current TTS configuration"""
        tts_provider_info = AVAILABLE_TTS.get(self._current_tts_provider, {})
        return {
            "provider": self._current_tts_provider,
            "model": self._current_tts_model,
            "voice": self._current_tts_voice,
            "provider_info": {
                "name": tts_provider_info.get("name"),
                "description": tts_provider_info.get("description"),
            },
            "has_api_key": bool(self._get_tts_api_key_with_fallback(self._current_tts_provider)),
        }

    def get_available_tts(self) -> Dict[str, Any]:
        """Get all available TTS providers"""
        result = {}
        for provider, info in AVAILABLE_TTS.items():
            result[provider] = {
                "name": info["name"],
                "description": info["description"],
                "cost": info["cost"],
                "models": info["models"],
                "voices": info["voices"],
                "has_api_key": bool(self._get_tts_api_key_with_fallback(provider)),
            }
        return result

    def update_tts_config(
        self,
        provider: TTSProvider,
        model: str,
        voice: str,
        api_key: Optional[str] = None
    ) -> bool:
        """Update TTS configuration"""
        # Validate provider
        if provider not in AVAILABLE_TTS:
            raise ValueError(f"Invalid TTS provider: {provider}")

        # Validate model
        if model not in AVAILABLE_TTS[provider]["models"]:
            raise ValueError(f"Invalid model for {provider}: {model}")

        # Validate voice
        if voice not in AVAILABLE_TTS[provider]["voices"]:
            raise ValueError(f"Invalid voice for {provider}: {voice}")

        # Update API key if provided
        if api_key:
            self._tts_api_keys[provider] = api_key

        # Check if we have an API key (with fallback to LLM key for shared providers)
        if not self._get_tts_api_key_with_fallback(provider):
            raise ValueError(f"No API key configured for {provider}")

        # Update current configuration
        self._current_tts_provider = provider
        self._current_tts_model = model
        self._current_tts_voice = voice

        return True

    def _get_tts_api_key_with_fallback(self, provider: TTSProvider) -> Optional[str]:
        """
        Get TTS API key with fallback to LLM key for shared providers (e.g., OpenAI)
        """
        # Try TTS-specific key first
        tts_key = self._tts_api_keys.get(provider)
        if tts_key:
            return tts_key

        # Fallback to LLM key for shared providers
        if provider == "openai":
            return self._llm_api_keys.get("openai")

        return None

    def get_tts_api_key(self, provider: Optional[TTSProvider] = None) -> Optional[str]:
        """Get API key for a TTS provider (defaults to current provider)"""
        if provider is None:
            provider = self._current_tts_provider
        return self._get_tts_api_key_with_fallback(provider)

    def set_tts_api_key(self, provider: TTSProvider, api_key: str) -> None:
        """Set API key for a TTS provider"""
        if provider not in AVAILABLE_TTS:
            raise ValueError(f"Invalid TTS provider: {provider}")
        self._tts_api_keys[provider] = api_key

    # ========================================================================
    # Legacy Properties (for backward compatibility)
    # ========================================================================

    @property
    def provider(self) -> LLMProvider:
        """Current LLM provider"""
        return self._current_llm_provider

    @property
    def model(self) -> str:
        """Current LLM model"""
        return self._current_llm_model

    @property
    def api_key(self) -> Optional[str]:
        """Current LLM API key"""
        return self._llm_api_keys.get(self._current_llm_provider)

    @property
    def tts_provider(self) -> TTSProvider:
        """Current TTS provider"""
        return self._current_tts_provider

    @property
    def tts_model(self) -> str:
        """Current TTS model"""
        return self._current_tts_model

    @property
    def tts_voice(self) -> str:
        """Current TTS voice"""
        return self._current_tts_voice

    @property
    def tts_api_key(self) -> Optional[str]:
        """Current TTS API key (with fallback)"""
        return self._get_tts_api_key_with_fallback(self._current_tts_provider)


# Singleton instance
config = AppConfig()