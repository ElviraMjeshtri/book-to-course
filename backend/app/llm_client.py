"""
Unified LLM client wrapper
Abstracts API calls to OpenAI, Anthropic, and Google Gemini
"""
from typing import List, Dict, Any, Optional
from .config import config, Provider


class LLMClient:
    """
    Unified interface for calling different LLM providers
    Automatically uses the configured provider and model
    """

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        Generic chat completion that works across all providers

        Args:
            messages: List of message dicts with 'role' and 'content'
                     [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            **kwargs: Provider-specific parameters

        Returns:
            The generated text response
        """
        provider = config.provider
        model = config.model
        api_key = config.api_key

        if not api_key:
            raise RuntimeError(f"No API key configured for {provider}")

        # Route to appropriate provider
        if provider == "openai":
            return self._openai_completion(messages, temperature, max_tokens, **kwargs)
        elif provider == "anthropic":
            return self._anthropic_completion(messages, temperature, max_tokens, **kwargs)
        elif provider == "gemini":
            return self._gemini_completion(messages, temperature, max_tokens, **kwargs)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def _openai_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> str:
        """OpenAI API completion"""
        from openai import OpenAI

        client = OpenAI(api_key=config.api_key)

        params: Dict[str, Any] = {
            "model": config.model,
            "messages": messages,
            "temperature": temperature,
        }

        if max_tokens is not None:
            params["max_tokens"] = max_tokens

        # Add any additional kwargs
        params.update(kwargs)

        response = client.chat.completions.create(**params)
        return response.choices[0].message.content or ""

    def _anthropic_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> str:
        """Anthropic Claude API completion"""
        from anthropic import Anthropic

        client = Anthropic(api_key=config.api_key)

        # Anthropic requires separating system message from other messages
        system_message = None
        user_messages = []

        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                user_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        params: Dict[str, Any] = {
            "model": config.model,
            "messages": user_messages,
            "temperature": temperature,
            "max_tokens": max_tokens or 4096,  # Anthropic requires max_tokens
        }

        if system_message:
            params["system"] = system_message

        # Add any additional kwargs
        params.update(kwargs)

        response = client.messages.create(**params)

        # Extract text from response
        if response.content and len(response.content) > 0:
            return response.content[0].text
        return ""

    def _gemini_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: Optional[int],
        **kwargs
    ) -> str:
        """Google Gemini API completion"""
        import google.generativeai as genai

        genai.configure(api_key=config.api_key)
        model = genai.GenerativeModel(config.model)

        # Convert messages to Gemini format
        # Gemini uses a different conversation structure
        system_instruction = None
        conversation_parts = []

        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            elif msg["role"] == "user":
                conversation_parts.append({"role": "user", "parts": [msg["content"]]})
            elif msg["role"] == "assistant":
                conversation_parts.append({"role": "model", "parts": [msg["content"]]})

        # Build the prompt
        if len(conversation_parts) == 1 and conversation_parts[0]["role"] == "user":
            # Simple single message
            prompt = conversation_parts[0]["parts"][0]
            if system_instruction:
                prompt = f"{system_instruction}\n\n{prompt}"
        else:
            # Multi-turn conversation
            prompt_parts = []
            if system_instruction:
                prompt_parts.append(system_instruction)
            for part in conversation_parts:
                role = "User" if part["role"] == "user" else "Assistant"
                prompt_parts.append(f"{role}: {part['parts'][0]}")
            prompt = "\n\n".join(prompt_parts)

        # Configure generation parameters
        generation_config = {
            "temperature": temperature,
        }
        if max_tokens is not None:
            generation_config["max_output_tokens"] = max_tokens

        # Generate response
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )

        return response.text

    def test_connection(self) -> Dict[str, Any]:
        """
        Test the current configuration by making a simple API call

        Returns:
            Dict with success status and message
        """
        try:
            # Simple test message
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'OK' if you can read this."}
            ]

            response = self.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=10
            )

            return {
                "success": True,
                "message": f"Successfully connected to {config.provider} ({config.model})",
                "response": response,
                "provider": config.provider,
                "model": config.model
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to connect: {str(e)}",
                "provider": config.provider,
                "model": config.model
            }


# Singleton instance
llm_client = LLMClient()