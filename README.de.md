
<p align="right">
  <a href="./README.md" title="English"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1ec-1f1e7.png" height="14" alt="UK flag" /> English</a> |
  <a href="./README.de.md" title="Deutsch"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1e9-1f1ea.png" height="14" alt="DE flag" /> Deutsch</a>
</p>

# GPX Route Manager PWA

PWA zum Import mehrerer GPX-Dateien (z. B. von Fahrrad-Navis oder Komoot/Strava-Exporten), zum Zusammenführen identischer Routen und zur Karten-Visualisierung/Verwaltung. Routen lassen sich ein-/ausblenden, farblich markieren und sortieren.

<p align="center">
  <img src="docs/assets/pwa-gpx3.png" alt="Kartenansicht" width="420"/>
  <img src="docs/assets/pwa-gpx.png" alt="Import-Ansicht" width="420"/>
</p>

## Funktionen

* Mehrfach-Import; Deduplizierung identischer Tracks
* Sichtbarkeit, Farbe, Sortierung pro Route
* PWA: installierbar, Offline-Fallback, Tile-Caching (OSM)
* Schnelles Parsing im Web-Worker (`fast-xml-parser`)
* Persistenz (IndexedDB/OPFS) mit Export/Import

## Technik

* Next.js 14 (App-Router) mit „standalone“-Output für Docker/Runtime
* Service Worker via `/api/sw` (Offline-Fallback, OSM-Tiles)
* Worker-Bundle nach `public/parse.worker.js` (über predev/prebuild)

## Voraussetzungen

* Node.js ≥ 20
* npm oder pnpm

## Schnellstart (Lokal)

```bash
# Installation
npm install         # alternativ: pnpm install

# Entwicklung
npm run dev
# bei Portkonflikt:
PORT=3001 npm run dev

# Produktion
npm run build
npm run start
# optional anderer Port:
PORT=3001 npm run start
```

### Worker manuell (normalerweise automatisch)

```bash
npx esbuild lib/gpx/parse.worker.ts --bundle --format=esm --outfile=public/parse.worker.js --platform=browser
```

## Docker

### Build & Run

```bash
docker build -t gpx-pwa:latest .
docker run --rm -p 3000:3000 --name gpx-pwa gpx-pwa:latest
```

### Docker-Compose

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

Start:

```bash
docker compose up --build
```

## PWA/Offline

Der SW liefert App-Cache, Tile-Cache (stale-while-revalidate) für `tile.openstreetmap.org` und Fallback auf `/offline.html`. Next-Interna (`/_next`) und `/api` werden nicht gecacht.

## Tests

Vitest (Unit) & Playwright (E2E): `npm run test`, `npm run e2e`.

## Troubleshooting

* **EADDRINUSE / Port belegt**: anderen Port setzen (`PORT=3001`) oder Prozess beenden.
* **Container-Name bereits vergeben**: bestehenden Container entfernen/umbenennen (`docker rm -f gpx-pwa`) oder anderen `--name` nutzen.
* **Healthcheck schlägt fehl**: intern `http://127.0.0.1:3000/` prüfen.
