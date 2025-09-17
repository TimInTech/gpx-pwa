<p align="right">
  <a href="./README.md" title="English"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1ec-1f1e7.png" height="14" alt="UK flag" /> English</a> |
  <a href="./README.de.md" title="Deutsch"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1e9-1f1ea.png" height="14" alt="DE flag" /> Deutsch</a>
</p>

# GPX Route Manager PWA

This application bundles multiple GPX files from bike navigation devices or exports from services like Komoot or Strava and renders them on a map. Identical routes are merged and shown once. Routes can be toggled, color-marked, and sorted.

<p align="center">
  <img src="docs/assets/pwa-gpx3.png" alt="Map view" width="420"/>
  <img src="docs/assets/pwa-gpx.png" alt="Import view" width="420"/>
</p>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nextjs,ts,react,nodejs,vercel,docker,nginx,vitest,playwright,eslint" alt="Tech stack icons" />
  </a>
</p>

## Features
- Import multiple GPX files; deduplicate identical tracks.
- Toggle visibility, color, and sorting per route.
- PWA: installable, offline-ready, clean caching with fallback.
- Fast GPX parsing in a Web Worker (fast-xml-parser).
- Persistent storage via IndexedDB/OPFS; export/import (JSON/GPX/ZIP).

## Prerequisites
- Node.js ≥ 20
- npm or pnpm
- Git (optional)

## Installation
```bash
cd ~/Downloads/gpx-pwa
npm install
# or: pnpm install
```

## Development

```bash
npm run dev
# on port conflict:
PORT=3001 npm run dev
```

## Production

```bash
npm run build
npm run start
# on port conflict:
# PORT=3001 npm run start
```

## Web Worker

Bundled by `predev`/`prebuild` to `public/parse.worker.js`.

```bash
npx esbuild lib/gpx/parse.worker.ts --bundle --format=esm --outfile=public/parse.worker.js --platform=browser
```

## Service Worker

Registered via `/api/sw`. Offline fallback at `/_offline`.

## Docker

```bash
docker build -t gpx-pwa:fix .
docker run --rm -p 3000:3000 --name gpx-pwa gpx-pwa:fix
curl -f http://localhost:3000 || echo FAIL
```

