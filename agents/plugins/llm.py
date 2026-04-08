"""LLM plugin factory — returns the right LLM based on agent config."""

from livekit.plugins import openai


def create_llm(provider: str = "openai", model: str = "gpt-4o", system_prompt: str = ""):
    """Create an LLM instance based on provider and model.

    Args:
        provider: 'openai', 'anthropic', or 'google'
        model: Model ID string
        system_prompt: System instructions for the agent
    """
    # LiveKit's OpenAI plugin supports OpenAI-compatible APIs
    # For Anthropic/Google, use their respective plugins when available
    if provider == "openai":
        return openai.LLM(
            model=model or "gpt-4o",
            temperature=0.7,
        )
    elif provider == "anthropic":
        return openai.LLM(
            model=model or "claude-sonnet-4-20250514",
            base_url="https://api.anthropic.com/v1",
            temperature=0.7,
        )
    elif provider == "google":
        return openai.LLM(
            model=model or "gemini-2.0-flash",
            temperature=0.7,
        )
    else:
        return openai.LLM(model="gpt-4o", temperature=0.7)
