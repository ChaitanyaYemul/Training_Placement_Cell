# API documentation — Phase 1

Only `GET /api/health` is implemented. It is public, requires no session, and accepts no parameters or body.

Response: HTTP 200 with `{"success":true,"data":{"status":"ok","service":"placement-api","phase":"initialization","databases":"not-configured"}}`.

This is process liveness, not database readiness. No database connectivity has been tested. All other endpoints, including writes, return HTTP 404 with `{"success":false,"error":{"code":"NOT_FOUND","message":"Endpoint not found"}}`.

Malformed JSON returns 400 (`VALIDATION_ERROR`); oversized bodies return 413 (`PAYLOAD_TOO_LARGE`); unexpected errors return 500 (`INTERNAL_ERROR`) without internal details. A global 120-request/minute/IP limit returns 429 (`RATE_LIMITED`). CORS permits configured `CLIENT_ORIGIN` values with credentials; it is not authentication.

Sessions, CSRF token issuance, authorization, CRUD, and database error mappings belong to later phases. The client rejects mutations without an explicit CSRF header; this guard is not a substitute for future server-side CSRF protection.
