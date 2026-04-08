"""ElevenLabs TTS plugin configuration."""

from livekit.plugins import elevenlabs


def create_tts(voice_id: str | None = None):
    """Create an ElevenLabs TTS instance.

    Args:
        voice_id: ElevenLabs voice ID. Uses default if not provided.
    """
    return elevenlabs.TTS(
        voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM",  # Default: Rachel
        model="eleven_turbo_v2",
    )
