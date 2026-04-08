"""Send SMS tool — sends a text message via Twilio."""

import os

from twilio.rest import Client
from livekit.agents import llm


def register_send_sms(fnc_ctx: llm.FunctionContext, org_id: str):

    @fnc_ctx.ai_callable(
        description="Send an SMS text message to the caller's phone number. "
        "Use for booking confirmations, follow-up info, or directions.",
    )
    async def send_sms(
        to_number: str,
        message: str,
    ) -> str:
        """Send an SMS.

        Args:
            to_number: Recipient phone number (E.164 format)
            message: Text message content (keep under 160 chars)
        """
        try:
            client = Client(
                os.environ["TWILIO_ACCOUNT_SID"],
                os.environ["TWILIO_AUTH_TOKEN"],
            )

            sms = client.messages.create(
                body=message,
                to=to_number,
                from_=os.environ.get("TWILIO_PHONE_NUMBER", ""),
            )

            return f"SMS sent successfully to {to_number}."
        except Exception as e:
            return f"Sorry, I wasn't able to send that text message. Error: {str(e)}"
