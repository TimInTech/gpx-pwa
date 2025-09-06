// lib/gpx/parse.worker.ts
import { XMLParser } from "fast-xml-parser"

type InMsg = {
  id: string
  type: "parse-gpx"
  data: { content: string; filename: string; options: any }
}

type OutOk = { id: string; type: "parse-success"; data: { routes: any[] } }
type OutErr = { id: string; type: "parse-error"; data: { error: string } }
type OutMsg = OutOk | OutErr

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
})

self.onmessage = (e: MessageEvent<InMsg>) => {
  const { id, type, data } = e.data
  if (type !== "parse-gpx") return

    try {
      const obj = parser.parse(data.content)
      const gpx = obj.gpx ?? obj.GPX ?? obj

      const tracks: any[] = []
      if (gpx?.trk) {
        const trks = Array.isArray(gpx.trk) ? gpx.trk : [gpx.trk]
        for (const trk of trks) {
          const name = trk.name ?? data.filename
          const segs = trk.trkseg ? (Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg]) : []
          const points: any[] = []

          for (const seg of segs) {
            const pts = seg.trkpt ? (Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt]) : []
            for (const p of pts) {
              const lat = Number(p["@_lat"])
              const lon = Number(p["@_lon"])
              const ele = p.ele !== undefined ? Number(p.ele) : undefined
              const time = p.time
              if (Number.isFinite(lat) && Number.isFinite(lon)) {
                points.push({ lat, lon, ele, time })
              }
            }
          }

          tracks.push({ id: `${id}:${tracks.length}`, name, points })
        }
      }

      const msg: OutOk = { id, type: "parse-success", data: { routes: tracks } }
      // @ts-ignore
      self.postMessage(msg)
    } catch (err: any) {
      const msg: OutErr = { id, type: "parse-error", data: { error: err?.message || String(err) } }
      // @ts-ignore
      self.postMessage(msg)
    }
}
