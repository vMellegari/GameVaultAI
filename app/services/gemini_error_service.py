import re
import logging


logger = logging.getLogger(__name__)


def get_gemini_http_status(error: Exception) -> int | None:
    """Extract an HTTP status from either Gemini SDK error hierarchy."""
    if type(error).__name__ in {"RateLimitError", "TooManyRequestsError"}:
        return 429

    for attribute in ("status_code", "code"):
        value = getattr(error, attribute, None)
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.isdigit():
            return int(value)

    response = getattr(error, "response", None)
    response_status = getattr(response, "status_code", None)
    if isinstance(response_status, int):
        return response_status

    match = re.search(r"(?:error\s+code|status\s+code)\s*:?\s*(\d{3})", str(error), re.I)
    return int(match.group(1)) if match else None


def create_interaction_with_fallback(
    client,
    *,
    primary_model: str,
    fallback_model: str,
    **request,
):
    """Use the reserve model for model availability or Gemini service failures."""
    try:
        return client.interactions.create(model=primary_model, **request)
    except Exception as error:
        status = get_gemini_http_status(error)
        retryable_statuses = {404, 500, 502, 503, 504}
        if (
            not fallback_model
            or fallback_model == primary_model
            or status not in retryable_statuses
        ):
            raise

        logger.warning(
            "Gemini primary model failed with status %s; trying fallback model %s",
            status,
            fallback_model,
        )
        return client.interactions.create(model=fallback_model, **request)
