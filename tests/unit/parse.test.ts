import { describe, it, expect } from "vitest"
import { parseGPX } from "@/lib/gpx/parse"

const SAMPLE_GPX_SINGLE = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="51.0" lon="8.0"><ele>100</ele><time>2020-01-01T00:00:00Z</time></trkpt>
      <trkpt lat="51.1" lon="8.1" />
    </trkseg>
  </trk>
</gpx>`

const SAMPLE_GPX_MULTI = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk><name>One</name><trkseg><trkpt lat="1" lon="2"/></trkseg></trk>
  <trk><name>Two</name><trkseg><trkpt lat="3" lon="4"/></trkseg></trk>
</gpx>`

describe("parseGPX", () => {
  it("parses a single track with points", () => {
    const tracks = parseGPX(SAMPLE_GPX_SINGLE, "sample.gpx")
    expect(tracks.length).toBe(1)
    const t = tracks[0]
    expect(t.name).toBe("Test Track")
    expect(t.points.length).toBe(2)
    expect(t.points[0]).toMatchObject({ lat: 51.0, lon: 8.0, ele: 100 })
  })

  it("parses multiple tracks", () => {
    const tracks = parseGPX(SAMPLE_GPX_MULTI, "multi.gpx")
    expect(tracks.length).toBe(2)
    expect(tracks[0].name).toBe("One")
    expect(tracks[1].name).toBe("Two")
  })

  it("handles empty or missing tracks", () => {
    const tracks = parseGPX("<gpx></gpx>")
    expect(tracks.length).toBe(0)
  })
})

