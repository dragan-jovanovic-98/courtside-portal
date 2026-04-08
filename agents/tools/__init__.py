"""Agent function calling tools."""

from livekit.agents import llm

from .book_appointment import register_book_appointment
from .transfer_call import register_transfer_call
from .send_sms import register_send_sms
from .lookup_info import register_lookup_info
from .capture_lead import register_capture_lead


def get_tools_for_agent(config: dict, fnc_ctx: llm.FunctionContext):
    """Register all tools based on agent configuration."""
    org_id = config.get("org_id", "")
    tools_config = config.get("tools_config", [])

    # Always register these core tools
    register_book_appointment(fnc_ctx, org_id)
    register_capture_lead(fnc_ctx, org_id)
    register_lookup_info(fnc_ctx, org_id)

    # Conditionally register based on config
    register_transfer_call(fnc_ctx)
    register_send_sms(fnc_ctx, org_id)

    return fnc_ctx
