// lib/gpx/parse.worker.ts
import { parseGPX } from "@/lib/gpx/parse"

type InMsg = {
  id: string
  type: "parse-gpx"
  data: { content: string; filename: string; options: any }
}

type OutOk = { id: string; type: "parse-success"; data: { routes: any[] } }
type OutErr = { id: string; type: "parse-error"; data: { error: string } }
type OutMsg = OutOk | OutErr

self.onmessage = (e: MessageEvent<InMsg>) => {
  const { id, type, data } = e.data
  if (type !== "parse-gpx") return

    try {
      const tracks = parseGPX(data.content, data.filename, data.options)
        .map((t, idx) => ({ ...t, id: `${id}:${idx}` }))

      const msg: OutOk = { id, type: "parse-success", data: { routes: tracks } }
      // @ts-ignore
      self.postMessage(msg)
    } catch (err: any) {
      const msg: OutErr = { id, type: "parse-error", data: { error: err?.message || String(err) } }
      // @ts-ignore
      self.postMessage(msg)
    }
}
