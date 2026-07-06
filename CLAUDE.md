# Photonix

## Current State
**Last updated:** 2026-07-06
**Status:** Awaiting Review
**Current tasks:** None [session 6a321e4e]
**Just completed:** Implemented + Playwright/curl-verified the outstanding CODE_REVIEW.md P0 security fixes, one commit each. P0.1 (890fdd5): imageAnalysis auto-login now restricted to first-run onboarding — unauthenticated account takeover on configured instances blocked, onboarding login still works. P0.6 (50a8f3d): logout clears Apollo cache + server-set httpOnly JWT/refresh cookies (new deleteTokenCookie/deleteRefreshTokenCookie mutations), fixed refresh-token race + shadowed-timeout bug, conditional Secure flag. P0.7 (89992e3): GraphiQL off in prod (graphiql=DEBUG), JWT cookies Secure+SameSite=Lax on HTTPS, robust HTTPS env parse. P0.3 (c2d4f19): originals now served via unguessable /download/<uuid>/ (X-Accel-Redirect); nginx /photos made internal so real filenames aren't enumerable. P0.5 was already fixed by earlier commits. P0.2/P0.4 deferred per review (single-user threat model). All 51 tests pass (2 network-skips).
**Open PRs:** None
**Blockers:** None

## Development Setup

- **Build**: `make build` (Docker Compose dev)
- **Start**: `make start` (must be running before tests)
- **Stop**: `make stop`
- **Shell**: `make shell` (exec into container)
- **Tests**: `make test` (runs pytest inside Docker container via `docker compose run`)
- Tests run inside Docker — the dev containers (`make start`) must be running first
- Test runner: `python test.py` which invokes pytest with `tests/` directory
- Test config: `tests/pytest.ini` sets `DJANGO_SETTINGS_MODULE = photonix.web.test_settings`
- Tests use SQLite in-memory DB and real Redis
- Raw processing tests may skip if raw photo files can't be downloaded from external URLs
