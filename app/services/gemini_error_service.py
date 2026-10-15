import re


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
