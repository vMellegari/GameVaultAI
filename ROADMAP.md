# GameVaultAI Roadmap

This roadmap focuses on maintainability, reliability, privacy, and usability in the existing library and gameplay-tracking product. Estimates are engineering time, not release dates; items can be refined as the project evolves.

| Work item | Scope | Estimate |
| --- | --- | ---: |
| Fill remaining backend test gaps | Add focused tests for language propagation, malformed Gemini/RAWG payloads, and provider failure paths that are not covered by the current API suite. Keep external calls mocked. | 4 h |
| Improve external-provider resilience | Review current timeout handling and Gemini fallback conditions, define bounded retry behavior where appropriate, and test fallback and malformed-response behavior. | 4 h |
| Review database query performance | Inspect library, session-history, and statistics queries with representative data; add or adjust indexes only where query plans justify them; document measured results. | 4 h |
| Strengthen privacy and security controls | Review upload validation and storage access, JWT configuration requirements, CORS defaults, and safe error/logging behavior. Document data retention and deletion expectations for account and media data. | 5 h |
| Add operational observability | Define structured request and provider-operation logs with request correlation, useful latency/error measurements, and no credentials or user notes in logs. Document basic production health checks and alert signals. | 4 h |
| Improve accessibility and responsive behavior | Audit keyboard navigation, focus visibility, labels, contrast, and layouts at narrow viewport sizes; fix findings and add a repeatable manual checklist. | 5 h |
| Document recovery and deployment operations | Write and verify practical backup/restore steps for PostgreSQL and session images, plus environment-variable and migration guidance for local and hosted deployments. | 3 h |

**Estimated total: 29 hours.** Estimates cover work that remains after the current preparation changes and exclude feature requests that depend on BYOP eligibility decisions. Existing ownership checks, pagination validation, and image-upload validation are already covered by the current backend suite and are not listed as future work.
