"""Transfer call tool — transfers to a specified phone number via Twilio."""

import os

from twilio.rest import Client
from livekit.agents import llm


def register_transfer_call(fnc_ctx: llm.FunctionContext):

    @fnc_ctx.ai_callable(
        description="Transfer the caller to a human staff member at the specified phone number. "
        "Use this when the caller explicitly asks to speak with a person or when "
        "you cannot resolve their request.",
    )
    async def transfer_call(
        phone_number: str,
        reason: str,
    ) -> str:
        """Transfer the call.

        Args:
            phone_number: Phone number to transfer to (E.164 format)
            reason: Brief reason for the transfer
        """
        # In production, this would use LiveKit's SIP transfer capabilities
        # or Twilio's call forwarding
        return f"Transferring you now to {phone_number}. Reason: {reason}. Please hold."
