"""Capture lead tool — extracts and stores caller info in contacts."""

import os

import httpx
from livekit.agents import llm


def register_capture_lead(fnc_ctx: llm.FunctionContext, org_id: str):

    @fnc_ctx.ai_callable(
        description="Save the caller's contact information when they provide their name, "
        "email, or other identifying details during the conversation.",
    )
    async def capture_lead(
        first_name: str,
        last_name: str = "",
        email: str = "",
        phone_number: str = "",
    ) -> str:
        """Capture caller contact info.

        Args:
            first_name: Caller's first name
            last_name: Caller's last name (if provided)
            email: Caller's email address (if provided)
            phone_number: Caller's phone number (if different from calling number)
        """
        url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

        if not phone_number:
            return "Contact information noted. I'll make sure someone follows up."

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{url}/rest/v1/portal_contacts",
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates",
                },
                json={
                    "org_id": org_id,
                    "phone_number": phone_number,
                    "first_name": first_name,
                    "last_name": last_name or None,
                    "email": email or None,
                },
            )

            return f"Got it, I've saved {first_name}'s contact information."
