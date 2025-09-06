# GPX-PWA Vollaudit & Auto-Fix

Dieses Dokument fasst Befunde, Fixes, Reproduzierbarkeit, Security-Nachweise und die Roadmap zusammen.

## Befundtabelle

ID | Kategorie | Schwere | Befund | Evidenz | Fix | Aufwand
---|---|---|---|---|---|---
BF-001 | Build/Types | Mittel | `@/lib/types` fehlte, Typen uneinheitlich | Import in `app/page.tsx`, Nutzung in Komponenten | `lib/types.ts` hinzugefügt (superset), optionale Felder für Kompatibilität | gering
BF-002 | SW/PWA | Mittel | Offline-Fallback `/offline.html` fehlte | Verweis im SW, Datei nicht vorhanden | `public/offline.html` hinzugefügt, SW aktualisiert | gering
BF-003 | SW/PWA | Mittel | Uneinheitlicher SW (kein Tiles-Cache) | `app/api/sw/route.ts` cachete keine Tiles | SW konsolidiert: Tiles stale-while-revalidate, HTML offline fallback, exclude `/_next`/`/api` | mittel
BF-004 | CI | Mittel | Deno-Workflow irrelevant | `.github/workflows/deno.yml` vorhanden | Workflow entfernt | gering
BF-005 | CI/CD | Mittel | Fehlende CI/JOBS (lint/test/build, arm64) | Keine Node-Workflows | `ci.yml`, `security.yml`, `release.yml` hinzugefügt (macOS arm64) | mittel
BF-006 | Security | Mittel | Kein SBOM/Scans | Keine Artefakte/Scans | Security-Workflow mit SBOM (Syft), Trivy, Gitleaks | mittel
BF-007 | Docker | Mittel | Kein gehärtetes Image | Keine Dockerfiles | Multi-stage Dockerfile, non-root, HEALTHCHECK, read-only in Compose | mittel
BF-008 | CSS | Niedrig | Dupliziertes globales CSS | `styles/globals.css` parallel zu `app/globals.css` | Datei entfernt; Single-Source `app/globals.css` | gering
BF-009 | SW-Duplikat | Niedrig | `public/sw.js` kollidiert konzeptionell | Datei vorhanden | entfernt; einziger SW via `/api/sw` | gering

## Fix-Dateien (vollständig im Repo)

- `lib/types.ts`
- `app/api/sw/route.ts` (konsolidiert)
- `public/offline.html`
- `lib/color/resolve.ts` (bereits eingeführt; Dokumentation hiermit aufgenommen)
- `.github/workflows/ci.yml`, `security.yml`, `release.yml`
- `Dockerfile`, `docker-compose.yml`

Zusätzlich: Entfernt `.github/workflows/deno.yml`, `styles/globals.css`, `public/sw.js`.

## Reproduzierbarkeit (Debian/Ubuntu; Node.js ≥20; pnpm optional)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git jq ripgrep imagemagick build-essential
corepack enable || true
corepack prepare pnpm@9 --activate || true

# Projekt
pnpm install || npm install
pnpm run predev || npm run predev
pnpm run build || npm run build

# Start
pnpm start || npm start

# Healthcheck
curl -f http://127.0.0.1:3000 || echo "Healthcheck failed"
```

## Security-Nachweis (Kurzfassung)

- SBOM: wird im Security-Workflow via `anchore/sbom-action` erzeugt (SPDX JSON).
- Trivy FS Scan: HIGH/CRITICAL werden gemeldet, Workflow bricht nicht hart ab (Exit-Code 0) – Review erforderlich, Upgrade-Pfade im PR verfolgen.
- Gitleaks: Secret-Scan mit Redaction aktiv.

Hinweis: Leaflet/OSM werden zur Laufzeit geladen; Caching im SW ist eingeschränkt und respektiert CORS.

## PWA/Offline

- Service Worker ausschließlich über `/api/sw` registriert; keine Duplikate in `public/`.
- Tiles-Cache (stale-while-revalidate) für `tile.openstreetmap.org`; HTML-Navigation mit Offline-Fallback.
- `/offline.html` vorhanden.

## Roadmap 30/60/90

- 30 Tage
  - E2E-Suite Playwright stabilisieren (Serverstart im CI; Headless Chromium Cache)
  - Konsolidierte Theme-Variablen in `app/globals.css` (Entfernung toter Variablen)
  - Striktere TypeScript-Checks (Build-Errors nicht ignorieren) + schrittweise Typisierung

- 60 Tage
  - Route-Rendering in Leaflet implementieren (Layer-Management, Performance-Simplification)
  - IndexedDB-Migrationen mit Versionierung & Backups (Export/Import)
  - Feature-Flags für Offline-Strategien (Tiles limitieren, Quoten)

- 90 Tage
  - Docker-Publish über Release-Workflow, Image < 250MB validieren (slim base, prune)
  - Security-Gates härten: Trivy Exit-Code >0 für CRITICAL in main, abhängig von Allowlist
  - PWA-Audit (Lighthouse) automatisieren, Manifest/Icons finalisieren

## Akzeptanzkriterien (Stand jetzt)

- `npm run build` bzw. `pnpm run build` baut erfolgreich (lokal geprüft)
- Einziger SW aktiv; Offline erreichbar; Tiles werden begrenzt gecacht
- CI/Workflows vorhanden; Security-Workflow mit SBOM/Scans
- Docker-Image non-root mit HEALTHCHECK (Compose: read-only FS)

