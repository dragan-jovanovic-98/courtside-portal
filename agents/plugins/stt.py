"""Deepgram STT plugin configuration."""

from livekit.plugins import deepgram


def create_stt():
    """Create a Deepgram STT instance configured for conversational use."""
    return deepgram.STT(
        model="nova-2",
        language="en-US",
        smart_format=True,
        interim_results=True,
    )
