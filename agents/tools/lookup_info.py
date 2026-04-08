"""Lookup info tool — queries org-specific FAQ/info from Supabase."""

import os

import httpx
from livekit.agents import llm


def register_lookup_info(fnc_ctx: llm.FunctionContext, org_id: str):

    @fnc_ctx.ai_callable(
        description="Look up business information like hours, pricing, services, "
        "or FAQs to answer the caller's question accurately.",
    )
    async def lookup_info(
        query: str,
    ) -> str:
        """Look up information.

        Args:
            query: What information the caller is asking about
        """
        # In production, this would query a knowledge base or FAQ table
        # For now, return a placeholder that prompts the agent to use its system prompt
        return (
            f"I don't have specific information about '{query}' in the database. "
            "Please use the business information from your instructions to answer, "
            "or let the caller know you'll have someone follow up."
        )
