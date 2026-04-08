"""Book appointment tool — checks availability and creates a booking."""

import os
from datetime import datetime

import httpx
from livekit.agents import llm


def register_book_appointment(fnc_ctx: llm.FunctionContext, org_id: str):

    @fnc_ctx.ai_callable(
        description="Book an appointment or reserve a court/facility for the caller. "
        "Collect their name, desired date/time, and service type before calling.",
    )
    async def book_appointment(
        client_name: str,
        date: str,
        time: str,
        service_type: str,
    ) -> str:
        """Book an appointment.

        Args:
            client_name: Name of the client
            date: Date in YYYY-MM-DD format
            time: Time in HH:MM format (24h)
            service_type: Type of service or facility
        """
        url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

        scheduled_at = f"{date}T{time}:00"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{url}/rest/v1/portal_bookings",
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
                json={
                    "org_id": org_id,
                    "title": f"{client_name} — {service_type}",
                    "service_type": service_type,
                    "scheduled_at": scheduled_at,
                    "duration_minutes": 60,
                    "status": "scheduled",
                    "notes": f"Booked via AI agent for {client_name}",
                },
            )

            if resp.status_code in (200, 201):
                return f"Appointment booked for {client_name} on {date} at {time} for {service_type}."
            else:
                return f"Sorry, I wasn't able to book that appointment. Please try again or call back during business hours."
