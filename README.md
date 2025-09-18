<p align="right">
  <a href="./README.md" title="English"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1ec-1f1e7.png" height="14" alt="UK flag" /> English</a> |
  <a href="./README.de.md" title="Deutsch"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1e9-1f1ea.png" height="14" alt="DE flag" /> Deutsch</a>
</p>

# GPX Route Manager PWA

A lightweight PWA to import multiple GPX files (e.g. from bike computers or exports from Komoot/Strava), deduplicate identical routes, and visualize/manage them on an interactive map. Routes can be toggled, color-coded, and sorted.

<p align="center">
  <img src="docs/assets/pwa-gpx3.png" alt="Map view" width="420"/>
  <img src="docs/assets/pwa-gpx.png" alt="Import view" width="420"/>
</p>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nextjs,ts,react,nodejs,docker,vitest,playwright" alt="Tech stack icons" />
  </a>
</p>

## Features
- Import multiple GPX files; merge identical tracks (dedupe)
- Per-route visibility, color, sort, and basic stats
- PWA: installable, offline fallback, tile caching (OSM)
- Fast parsing in a Web Worker (`fast-xml-parser`)
- Persistent client storage (IndexedDB/OPFS) with export/import

## Tech & Layout
- Next.js 14 “app/” with standalone output for Docker/runtime
- Service Worker served from `/api/sw` with offline fallback & OSM tile cache
- Worker bundle generated to `public/parse.worker.js` (predev/prebuild)

## Requirements
- Node.js ≥ 20
- npm or pnpm

## Quickstart (Local)
```bash
# install
npm install         # or: pnpm install

# dev (Next.js)
npm run dev

# if the default port is busy:
PORT=3001 npm run dev

# production build + start
npm run build
npm run start
# or change the port:
PORT=3001 npm run start
````

### (Re)build the GPX parser worker manually (normally auto via pre* scripts)

```bash
npx esbuild lib/gpx/parse.worker.ts --bundle --format=esm --outfile=public/parse.worker.js --platform=browser
```

## Docker

### Build & run

```bash
# build multi-stage image
docker build -t gpx-pwa:latest .

# run container on host port 3000
docker run --rm -p 3000:3000 --name gpx-pwa gpx-pwa:latest
```

### Docker Compose

```yaml
services:
  gpx-pwa:
    build: .
    image: gpx-pwa:latest
    container_name: gpx-pwa
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped
```

Start via:

```bash
docker compose up --build
```

## PWA/Offline

The SW at `/api/sw` installs an app cache, an OSM tiles cache (`tile.openstreetmap.org`, stale-while-revalidate), and a navigation fallback to `/offline.html`. Next internals (`/_next`) and `/api` are excluded.

## Testing

* Unit tests (Vitest) & E2E (Playwright): `npm run test`, `npm run e2e`.

## Troubleshooting

* **Port in use / EADDRINUSE**: try another port (`PORT=3001`) or stop the other process.
* **Container name in use**: `docker rm -f gpx-pwa` or use a different `--name`.
* **Healthcheck fails**: check `http://127.0.0.1:3000/` inside the container.
