// lib/gpx/parse.ts
import { XMLParser } from "fast-xml-parser"

export type ParsedTrackPoint = {
  lat: number
  lon: number
  ele?: number
  time?: string
}

export type ParsedTrack = {
  id: string
  name: string
  points: ParsedTrackPoint[]
}

export type ParseOptions = {
  // Platzhalter für zukünftige Optionen
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
})

/**
 * parseGPX: Extrahiert Tracks und Trackpunkte aus einem GPX-String.
 * Gibt eine stabile Struktur für weitere Verarbeitung zurück.
 */
export function parseGPX(content: string, filename = "gpx.gpx", _options?: ParseOptions): ParsedTrack[] {
  const obj = parser.parse(content)
  const gpx = obj.gpx ?? obj.GPX ?? obj

  const tracks: ParsedTrack[] = []
  if (!gpx) return tracks

  const trkNode = gpx.trk
  if (!trkNode) return tracks

  const trks = Array.isArray(trkNode) ? trkNode : [trkNode]
  for (let trkIdx = 0; trkIdx < trks.length; trkIdx++) {
    const trk = trks[trkIdx]
    const name: string = trk?.name ?? filename
    const segs = trk?.trkseg ? (Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg]) : []
    const points: ParsedTrackPoint[] = []

    for (const seg of segs) {
      const pts = seg?.trkpt ? (Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt]) : []
      for (const p of pts) {
        const lat = Number(p?.["@_lat"]) 
        const lon = Number(p?.["@_lon"]) 
        const ele = p?.ele !== undefined ? Number(p.ele) : undefined
        const time = p?.time
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          points.push({ lat, lon, ele: Number.isFinite(ele!) ? ele : undefined, time })
        }
      }
    }

    tracks.push({ id: String(trkIdx), name, points })
  }

  return tracks
}

