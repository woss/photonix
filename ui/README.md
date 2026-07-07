# Photonix UI

React frontend for [Photonix](https://photonix.org), built with Vite, React 19,
TypeScript, Tailwind CSS 4, TanStack Router, Apollo Client and Zustand.

## Development

There are two ways to run the UI during development. Both need the Docker dev
stack running first (`make start` from the repo root), which provides the
Django/GraphQL backend, nginx, Postgres and Redis.

### 1. Inside the container (default)

`make start` runs a Vite dev server inside the `photonix` container
(supervisord program `vite`) and serves everything through nginx at
**http://localhost:8888**. Source files are bind-mounted, so edits on the host
hot-reload in the browser. No host-side setup is needed.

### 2. On the host

For faster tooling (editor integration, quicker restarts) you can run Vite on
the host against the container backend:

```sh
cd ui
npm install
npm run dev            # serves on http://localhost:3000
```

`vite.config.ts` proxies `/graphql`, `/thumbnailer`, `/thumbnails`,
`/download` and `/photos` to the container nginx (default
`http://localhost:8888`, override with the `PHOTONIX_BACKEND` env var). The
proxy also rewrites the `Origin`/`Referer` headers so Django's CSRF origin
check passes when the app is served from a different port.

## Scripts

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Vite dev server on :3000                         |
| `npm run build`        | Typecheck (`tsc -b`) + production build          |
| `npm run lint`         | ESLint over the whole package                    |
| `npm run test:e2e`     | Playwright end-to-end suite                      |
| `npm run test:e2e:ui`  | Playwright suite in interactive UI mode          |

Equivalent repo-root Makefile targets: `make lint-ui`, `make build-ui`,
`make e2e` (alias `make test-ui`).

## End-to-end tests

The Playwright specs in `e2e/` run against the real dev stack at
`http://localhost:8888` — start it with `make start` before running them.

- Specs seed and clean up their own users/photos by piping Python into
  `manage.py shell` in the container (see `e2e/test-utils.ts`).
- Image fixtures (`/data/photos/test_<colour>.jpg`, `checkerboard.jpg`) are
  generated inside the container by `e2e/global-setup.ts` on the first run —
  no manual setup required.
- Tests share one database and run serially (`workers: 1`).

```sh
cd ui
npx playwright install chromium   # first time only
npm run test:e2e
```

In CI the suite runs in the `test-e2e` job of
`.github/workflows/docker-build.yml`, which boots the compose stack with
`docker/docker-compose.ci.yml` overrides (no demo-photo downloads).
