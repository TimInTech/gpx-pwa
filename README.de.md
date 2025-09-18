<p align="right"> <a href="./README.md" title="English"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1ec-1f1e7.png" height="14" alt="UK flag" /> English</a> | <a href="./README.de.md" title="Deutsch"><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f1e9-1f1ea.png" height="14" alt="DE flag" /> Deutsch</a> </p>
GPX Route Manager PWA
Diese Anwendung bündelt mehrere GPX-Dateien von Fahrrad-Navis oder Exporten aus Diensten wie Komoot oder Strava und stellt sie auf einer Karte dar. Identische Routen werden zusammengeführt und nur einmal angezeigt. Routen können ein-/ausgeblendet, farblich markiert und sortiert werden.

<p align="center"> <img src="docs/assets/pwa-gpx3.png" alt="Kartenansicht" width="420"/> <img src="docs/assets/pwa-gpx.png" alt="Import-Ansicht" width="420"/> </p> <p align="center"> <a href="https://skillicons.dev"> <img src="https://skillicons.dev/icons?i=nextjs,ts,react,nodejs,vercel,docker,nginx,vitest,playwright,eslint" alt="Tech-Stack-Icons" /> </a> </p>
Funktionen
Import mehrerer GPX-Dateien, Zusammenführung identischer Tracks

Sichtbarkeit, Farbcodierung und Sortierung pro Route

PWA: installierbar, offline nutzbar, sauberer Cache mit Fallback

Schnelles GPX-Parsing im Web-Worker (fast-xml-parser)

Persistenz über IndexedDB/OPFS; Export/Import (JSON/GPX/ZIP)

Voraussetzungen
Node.js ≥ 20

npm oder pnpm

Git (optional)

Installation
bash
Code kopieren
cd ~/github_repos/gpx-pwa
npm install
# alternativ: pnpm install
Entwicklung
bash
Code kopieren
npm run dev
# bei Port-Konflikt:
PORT=3001 npm run dev
Produktion
bash
Code kopieren
npm run build
npm run start
# bei Port-Konflikt:
# PORT=3001 npm run start
Web-Worker
Wird durch predev/prebuild nach public/parse.worker.js gebündelt.

bash
Code kopieren
npx esbuild lib/gpx/parse.worker.ts --bundle --format=esm --outfile=public/parse.worker.js --platform=browser
Service Worker
Registrierung über /api/sw. Offline-Fallback unter /_offline.

Docker
bash
Code kopieren
docker build -t gpx-pwa:latest .
docker run --rm -p 3000:3000 --name gpx-pwa gpx-pwa:latest
curl -f http://localhost:3000 || echo FAIL
