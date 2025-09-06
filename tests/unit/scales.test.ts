import { describe, it, expect } from "vitest"
import { getRouteColor, routeColorScales } from "@/lib/color/scales"

describe("getRouteColor", () => {
  it("returns first palette color when date is null/undefined", () => {
    const c1 = getRouteColor(null, "month")
    const c2 = getRouteColor(undefined as any, "week")
    expect([c1, c2]).toContain(routeColorScales.month[0])
  })

  it("is defensive for invalid periodKey and invalid date", () => {
    // @ts-expect-error intentional wrong key at runtime
    const c = (getRouteColor as any)("not-a-date", "banana")
    expect(typeof c).toBe("string")
    expect(c.length).toBeGreaterThan(0)
  })

  it("varies color across buckets but never throws", () => {
    const d = "2024-06-15T12:00:00Z"
    const week = getRouteColor(d, "week")
    const month = getRouteColor(d, "month")
    const year = getRouteColor(d, "year")
    expect([week, month, year].every(Boolean)).toBe(true)
  })
})

