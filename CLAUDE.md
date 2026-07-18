# Photonix

## Current State
**Last updated:** 2026-07-19 (early hours)
**Status:** Awaiting Review — UI parity/polish pass vs master complete; full e2e suite 67/67 green
**Current tasks:** None
**Just completed:** Side-by-side Playwright comparison vs demo.photonix.org, then four commits (all pushed): `958dd9c` shadcn/ui foundation (Tailwind-4 setup, dark theme tokens, primary = brand teal #00A8A1, Button/Input/Dialog/Select/Switch/DropdownMenu/ScrollArea/Tooltip; Modal restored master's 5-segment brand accent strip; header menu shows user email via profile query; login/save buttons + switches recolored blue→teal); `0e857b1` map fixes (leaflet `isolate` stacking context so tabs/menu/dialogs render above the map, SearchBar on /map + /albums like master, leaflet.markercluster with on-brand teal-ring cluster icons, photo-thumbnail markers kept); `4d17230` scrollbar polish (thin dark scoped scrollbars on fine pointers, hidden on coarse; filter strip in Radix ScrollArea with master-style hover pill thumb; Colors facet = master's compact 7-col swatch grid w/ exact ColorTags hues, tooltips, teal selected ring — no native scrollbars anywhere); `79db88d` library-switching spec hardened (wait for Radix menu close before re-click; race was test-only, human flow verified). Kept intentionally-better rewrite features: tile deep-zoom, carousel, keyboard shortcuts, richer detail toolbar/sidebar w/ mini-map, hierarchical locations, slider value labels, albums empty state. Comparison screenshots in `shots/parity-2026-07-18/`. NOTE: container vite needed in-place rewrites of the single-file bind-mounts (vite.config.ts/tsconfig.app.json/index.html — new-inode issue) + `npm install --no-package-lock` in-container; host files are canonical and bake in on next `make build`. Host Playwright browsers were re-downloaded (`npx playwright install chromium`) after the dep bump. Compose project name for the currently-running stack is `docker` (not `photonix`) — e2e helpers need `COMPOSE_PROJECT_NAME=docker`.
**Open PRs:** None
**Blockers:** None. Remaining known follow-ups: P4 backend tile items in FRONTEND_REWRITE.md (tile caching, debug artifacts, seam fix); optional PWA/M5.


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
