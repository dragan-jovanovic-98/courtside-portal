"""Court Side AI — LiveKit Voice Agent.

Main entrypoint for the LiveKit agent worker.
Handles inbound calls via Twilio SIP → LiveKit → Agent pipeline.
"""

import os
import json
import logging
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import silero

from plugins.stt import create_stt
from plugins.tts import create_tts
from plugins.llm import create_llm
from tools import get_tools_for_agent

load_dotenv()
logger = logging.getLogger("courtside-agent")


async def fetch_agent_config(agent_id: str) -> dict:
    """Fetch agent configuration from Supabase."""
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{url}/rest/v1/portal_agents?id=eq.{agent_id}&select=*",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
        )
        data = resp.json()
        return data[0] if data else {}


async def post_call_data(payload: dict):
    """Send completed call data to the webhook endpoint."""
    webhook_url = os.environ.get("WEBHOOK_URL", "http://localhost:3000/api/webhooks/livekit")

    async with httpx.AsyncClient() as client:
        await client.post(webhook_url, json=payload, timeout=30)


async def entrypoint(ctx: JobContext):
    """Main agent entrypoint — called for each new session."""
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Extract agent_id from room metadata or participant attributes
    room = ctx.room
    metadata = json.loads(room.metadata or "{}")
    agent_id = metadata.get("agent_id", "")

    # Fetch agent config
    config = await fetch_agent_config(agent_id) if agent_id else {}

    # Build pipeline components
    stt = create_stt()
    tts = create_tts(config.get("voice_id"))
    agent_llm = create_llm(
        provider=config.get("llm_provider", "openai"),
        model=config.get("llm_model", "gpt-4o"),
        system_prompt=config.get("system_prompt", ""),
    )

    # Build system prompt
    system_prompt = config.get("system_prompt", "")
    greeting = config.get("preferred_greeting", "Hi, how can I help you today?")

    if not system_prompt:
        purpose = config.get("purpose_description", "a helpful AI receptionist")
        system_prompt = f"""You are {config.get('name', 'an AI assistant')}, {purpose}.
Be friendly, professional, and concise. Help the caller with their request.
If you need to use a tool (like booking an appointment), let the caller know
what you're doing: "Let me check on that for you."
"""

    # Set up function calling tools
    fnc_ctx = llm.FunctionContext()
    tools = get_tools_for_agent(config, fnc_ctx)

    # Create voice assistant
    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=stt,
        llm=agent_llm,
        tts=tts,
        fnc_ctx=fnc_ctx,
        chat_ctx=llm.ChatContext().append(role="system", text=system_prompt),
    )

    # Track call data
    call_start = datetime.now(timezone.utc)
    transcript_entries = []
    actions_taken = []

    @assistant.on("user_speech_committed")
    def on_user_speech(msg):
        transcript_entries.append({
            "role": "caller",
            "content": msg.content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    @assistant.on("agent_speech_committed")
    def on_agent_speech(msg):
        transcript_entries.append({
            "role": "agent",
            "content": msg.content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    @assistant.on("function_calls_finished")
    def on_function_done(called_functions):
        for fn in called_functions:
            actions_taken.append({
                "tool_name": fn.call_info.function_info.name,
                "input": fn.call_info.arguments,
                "output": fn.result if fn.result else {},
                "duration_ms": None,
                "error": fn.exception if fn.exception else None,
            })

    # Start the assistant
    assistant.start(room)
    await assistant.say(greeting, allow_interruptions=True)

    # Wait for disconnect
    await ctx.wait_for_disconnect()

    # Post call data
    call_end = datetime.now(timezone.utc)
    duration = int((call_end - call_start).total_seconds())

    # Get caller info from SIP participant
    caller_number = metadata.get("caller_number", "")
    caller_name = metadata.get("caller_name", "")

    await post_call_data({
        "agent_id": agent_id,
        "org_id": config.get("org_id", ""),
        "caller_number": caller_number,
        "caller_name": caller_name,
        "started_at": call_start.isoformat(),
        "ended_at": call_end.isoformat(),
        "duration_seconds": duration,
        "transcript": transcript_entries,
        "actions": actions_taken,
        "summary": "",  # Generated by post-processing
        "sentiment": None,
        "engagement_level": None,
        "outcome_confidence": None,
    })


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
