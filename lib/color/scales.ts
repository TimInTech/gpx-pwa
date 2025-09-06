// lib/color/scales.ts
// Robust color selection that never throws, even on unexpected inputs.
const defaultPalette = [
  "#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4",
  "#84cc16", "#ec4899", "#14b8a6", "#f97316", "#22c55e", "#3b82f6",
]

// Keep keys aligned with callers: "week" | "month" | "year"
export const routeColorScales: Record<"week"|"month"|"year", string[]> = {
  week:  defaultPalette,
  month: defaultPalette,
  year:  defaultPalette,
}

function safePalette(periodKey?: string): string[] {
  const p = (periodKey === "week" || periodKey === "month" || periodKey === "year")
    ? routeColorScales[periodKey]
    : undefined
  const fall = Array.isArray(defaultPalette) && defaultPalette.length ? defaultPalette : ["#888"]
  return Array.isArray(p) && p.length ? p : fall
}

function clampIndex(idx: number, len: number): number {
  if (!Number.isFinite(idx) || !Number.isFinite(len) || len <= 0) return 0
  const m = idx % len
  return m < 0 ? m + len : m
}

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime())
}

/**
 * Pick a stable color for a given date and period bucket.
 * - date: ISO string or null/undefined
 * - periodKey: "week" | "month" | "year"  (defaults to "month")
 */
export function getRouteColor(
  date?: string | null,
  periodKey: "week" | "month" | "year" = "month"
): string {
  const palette = safePalette(periodKey)
  if (!date) return palette[0]

  const d = new Date(date)
  if (!isValidDate(d)) return palette[0]

  let index = 0
  switch (periodKey) {
    case "week": {
      // Day of week [0..6]
      index = d.getUTCDay()
      break
    }
    case "month": {
      // Day of month [1..31] → shift to [0..30]
      index = Math.max(0, d.getUTCDate() - 1)
      break
    }
    case "year": {
      // Month index [0..11]
      index = d.getUTCMonth()
      break
    }
  }
  return palette[clampIndex(index, palette.length)]
}

export function getPeriodLabel(periodKey: "week" | "month" | "year", index: number): string {
  switch (periodKey) {
    case "week":
      return index === 0 ? "Diese Woche" : index === 1 ? "Letzte Woche" : `Vor ${index} Wochen`
    case "month":
      return index === 0 ? "Dieser Monat" : index === 1 ? "Letzter Monat" : `Vor ${index} Monaten`
    case "year":
      return index === 0 ? "Dieses Jahr" : index === 1 ? "Letztes Jahr" : `Vor ${index} Jahren`
    default:
      return "Unbekannt"
  }
}

