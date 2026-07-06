# Photonix

## Current State
**Last updated:** 2026-07-07
**Status:** Awaiting Review
**Current tasks:** None [session b409d651]
**Just completed:** Implemented all 17 CODE_REVIEW.md P1 (pipeline reliability) + P2 (correctness) fixes, one verified commit each (red/green regression test or in-container behavioural check per fix). P1: worker-thread crash containment (f0e8da6), watcher survives deletions (332ebcb), get_or_create_tag infinite loop (e74c696), atomic Task.claim() (1e59aa5), idempotent Task.complete() (4418872), Redis lock expiry + HTTP timeouts (123cbdc), no tasks for disabled classifiers (df892cc). P2: CR3 import (c14c19c), GPS /3600 (33c6525), import_photos repair (9a65e60), face rotation crop/positions (6d2e555), per-library face ANN index (2436a6d), face graph-cache f-string keys (d71351e), color classifier non-RGB + hue wraparound (9ae5ea9), scheduler steady-state (28935a9), library-scoped lens/photo dedup + raw+JPEG pairing (4010e06), New Year label + XK/SS country codes (81f4909). Full suite: 71 passed, 2 network-skips (was 51). Commit datetimes set 12h in the past per request. Uncommitted from session 8e832b8a: docker-compose.dev.yml `name: photonix` (load-bearing; both photonix & battery-badger still publish host port 5432 so they can't run postgres simultaneously).
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
