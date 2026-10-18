# Backend API — authentication commit

Base path `/api`. Responses use `{success:true,data:...}` and errors use `{success:false,error:{code,message,details?}}`. Auth responses are non-cacheable. Database/migration errors are sanitized.

| Method/path          | Auth                    | Input                        | Result                                                                                                       |
| -------------------- | ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET /health          | Public                  | None                         | 200 process liveness; runtime reports phase authentication and databases not-checked, not database readiness |
| GET /auth/csrf-token | Public                  | None                         | 200 `{csrfToken}` plus anonymous session cookie                                                              |
| POST /auth/register  | CSRF + Origin           | `{email,password,fullName?}` | 201 `{id,email,role:"student"}`; role input is discarded; other unknown keys rejected; no automatic login    |
| POST /auth/login     | CSRF + Origin           | `{email,password}`           | 200 `{user:{id,email,role,studentId,adminId},csrfToken}`; session regenerated                                |
| GET /auth/me         | Session                 | None                         | 200 authoritative safe current user; 401 anonymous/inactive                                                  |
| POST /auth/logout    | Session + CSRF + Origin | Empty body                   | 204; session destroyed and cookie cleared                                                                    |

Register/login enforce email syntax, bounded passwords and unknown-key rejection. Duplicate registration returns 409 CONFLICT. Invalid/unknown/inactive login returns the same 401 UNAUTHENTICATED message. Invalid CSRF/origin returns 403 FORBIDDEN. Combined login/register rate limiting returns 429 RATE_LIMITED. Invalid inputs return 400 VALIDATION_ERROR with field paths, never submitted values. Backend role middleware returns 403 for insufficient permissions; business routes are added in the separate business API commit.

A client must first obtain a token with cookie credentials enabled, send X-CSRF-Token and the configured Origin on writes, then use the new login token afterward. No session ids or hashes appear in JSON. No bearer token/localStorage authentication exists. All protected data must use the session's user id, not a client-supplied ownership id.
