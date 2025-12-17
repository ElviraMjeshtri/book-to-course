"""
Unified TTS (Text-to-Speech) client wrapper
Abstracts API calls to OpenAI TTS, ElevenLabs, and Google Cloud TTS
"""
from pathlib import Path
from typing import Optional
from .config import config


class TTSClient:
    """
    Unified interface for calling different TTS providers
    Automatically uses the configured provider, model, and voice
    """

    def synthesize_speech(
        self,
        text: str,
        output_path: Path,
        voice: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Path:
        """
        Synthesize speech from text and save to file

        Args:
            text: Text to convert to speech
            output_path: Path where audio file will be saved
            voice: Optional voice override (uses configured voice if not provided)
            model: Optional model override (uses configured model if not provided)

        Returns:
            Path to the generated audio file
        """
        provider = config.tts_provider
        api_key = config.tts_api_key

        if not api_key:
            raise RuntimeError(f"No API key configured for TTS provider: {provider}")

        # Use configured values if not overridden
        if voice is None:
            voice = config.tts_voice
        if model is None:
            model = config.tts_model

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Route to appropriate provider
        if provider == "openai":
            return self._openai_tts(text, output_path, voice, model, api_key)
        elif provider == "elevenlabs":
            return self._elevenlabs_tts(text, output_path, voice, model, api_key)
        elif provider == "google_tts":
            return self._google_tts(text, output_path, voice, model, api_key)
        else:
            raise ValueError(f"Unsupported TTS provider: {provider}")

    def _openai_tts(
        self,
        text: str,
        output_path: Path,
        voice: str,
        model: str,
        api_key: str,
    ) -> Path:
        """OpenAI TTS synthesis"""
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        # Create temporary file first
        temp_path = output_path.with_suffix(".tmp.mp3")

        # Stream audio to file
        with client.audio.speech.with_streaming_response.create(
            model=model,
            voice=voice,
            input=text,
        ) as response:
            response.stream_to_file(temp_path)

        # Rename to final path
        temp_path.rename(output_path)

        return output_path

    def _elevenlabs_tts(
        self,
        text: str,
        output_path: Path,
        voice: str,
        model: str,
        api_key: str,
    ) -> Path:
        """ElevenLabs TTS synthesis"""
        try:
            from elevenlabs import VoiceSettings
            from elevenlabs.client import ElevenLabs
        except ImportError:
            raise ImportError(
                "elevenlabs package not installed. Install with: pip install elevenlabs"
            )

        client = ElevenLabs(api_key=api_key)

        # Generate audio
        audio_generator = client.generate(
            text=text,
            voice=voice,
            model=model,
        )

        # Write to file
        temp_path = output_path.with_suffix(".tmp.mp3")
        with open(temp_path, "wb") as f:
            for chunk in audio_generator:
                f.write(chunk)

        # Rename to final path
        temp_path.rename(output_path)

        return output_path

    def _google_tts(
        self,
        text: str,
        output_path: Path,
        voice: str,
        model: str,
        api_key: str,
    ) -> Path:
        """Google Cloud TTS synthesis"""
        try:
            from google.cloud import texttospeech
            import google.auth.credentials
        except ImportError:
            raise ImportError(
                "google-cloud-texttospeech package not installed. "
                "Install with: pip install google-cloud-texttospeech"
            )

        # Create credentials from API key
        # Note: Google Cloud typically uses service account JSON files,
        # but we're using an API key for simplicity
        # For production, consider using service account authentication

        # Set environment variable for authentication
        import os
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = api_key

        client = texttospeech.TextToSpeechClient()

        # Set the text input to be synthesized
        synthesis_input = texttospeech.SynthesisInput(text=text)

        # Determine audio encoding based on model quality
        if model == "neural2":
            audio_encoding = texttospeech.AudioEncoding.MP3
        elif model == "wavenet":
            audio_encoding = texttospeech.AudioEncoding.MP3
        else:  # standard
            audio_encoding = texttospeech.AudioEncoding.MP3

        # Build the voice request
        voice_params = texttospeech.VoiceSelectionParams(
            language_code=voice.split("-")[0] + "-" + voice.split("-")[1],  # e.g., "en-US"
            name=voice,
        )

        # Select the audio config
        audio_config = texttospeech.AudioConfig(
            audio_encoding=audio_encoding,
            speaking_rate=1.0,
            pitch=0.0,
        )

        # Perform the text-to-speech request
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config,
        )

        # Write to file
        temp_path = output_path.with_suffix(".tmp.mp3")
        with open(temp_path, "wb") as f:
            f.write(response.audio_content)

        # Rename to final path
        temp_path.rename(output_path)

        return output_path

    def test_connection(self) -> dict:
        """
        Test the current TTS configuration by synthesizing a short phrase

        Returns:
            Dict with success status and message
        """
        try:
            import tempfile

            # Create a temporary file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                temp_path = Path(tmp.name)

            # Synthesize a test phrase
            test_text = "Hello, this is a test of the text to speech system."

            result_path = self.synthesize_speech(
                text=test_text,
                output_path=temp_path,
            )

            # Check if file was created and has content
            if result_path.exists() and result_path.stat().st_size > 0:
                # Clean up test file
                result_path.unlink()

                return {
                    "success": True,
                    "message": f"Successfully connected to {config.tts_provider} "
                              f"({config.tts_model}, {config.tts_voice})",
                    "provider": config.tts_provider,
                    "model": config.tts_model,
                    "voice": config.tts_voice,
                }
            else:
                return {
                    "success": False,
                    "message": "TTS generated empty audio file",
                    "provider": config.tts_provider,
                    "model": config.tts_model,
                    "voice": config.tts_voice,
                }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to connect: {str(e)}",
                "provider": config.tts_provider,
                "model": config.tts_model,
                "voice": config.tts_voice,
            }


# Singleton instance
tts_client = TTSClient()