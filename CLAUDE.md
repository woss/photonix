# Photonix

## Current State
**Last updated:** 2026-07-07
**Status:** Awaiting Review
**Current tasks:** None [session b409d651]
**Just completed:** Implemented all 7 CODE_REVIEW.md P3 (testing) fixes, each independently verified (red run or mutation check) and committed. P3.4 requeue coverage + age_hours fix (b3fa6e0), P3.5 ModelManager tests (b350c0e), P3.2 unique UserFactory usernames (7ec28b8) + for_user() scoping of API lookups with 12 cross-user authz tests — 10 were real holes: resolve_photo/camera/lens, photoFileMetadata and ~10 mutations were unscoped (af7dcb1), P3.3 COVERAGE=1 / make test-coverage via coverage lib, config inline in test.py because the container only mounts subpaths (23313b2), P3.7 offline model-download test via faked HTTP + runtime-generated synthetic DNG covers raw pipeline, download tests marked `network`, no large files committed (af241bc), P3.1 tests on PRs, publishing stays push-only, actionlint-clean (1374efe), P3.6 fixed ./App import, Login/Browse RTL tests, react-leaflet jest stub, IntersectionObserver shim, test-ui CI job gating build (2588597). Backend suite 97 passed/2 network-skips (was 71); UI 3 suites/7 tests pass (was 1 broken suite). UI tests run in the dev container (`cd /srv/ui && CI=true npx react-scripts test --watchAll=false`); host npm 11 hits an arborist EISDIR bug with this lockfile. All 26 session commits (P1+P2+P3) local-only on master, commit datetimes 12h in the past per request. Uncommitted from session 8e832b8a: docker-compose.dev.yml `name: photonix` (load-bearing; both photonix & battery-badger still publish host port 5432 so they can't run postgres simultaneously).
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
