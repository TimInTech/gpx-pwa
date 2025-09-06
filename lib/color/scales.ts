export interface ColorScale {
  week: string[]
  month: string[]
  year: string[]
}

// Nature-inspired color palette for different time periods
export const routeColorScales: ColorScale = {
  week: [
    "#15803d", // green-700 - current week
    "#16a34a", // green-600 - last week
    "#22c55e", // green-500 - 2 weeks ago
    "#4ade80", // green-400 - 3 weeks ago
    "#86efac", // green-300 - older weeks
  ],
  month: [
    "#15803d", // green-700 - current month
    "#ca8a04", // yellow-600 - last month
    "#ea580c", // orange-600 - 2 months ago
    "#dc2626", // red-600 - 3 months ago
    "#7c3aed", // violet-600 - older months
  ],
  year: [
    "#15803d", // green-700 - current year
    "#0891b2", // cyan-600 - last year
    "#7c3aed", // violet-600 - 2 years ago
    "#dc2626", // red-600 - 3 years ago
    "#6b7280", // gray-500 - older years
  ],
}

export function getRouteColor(date: string | null, periodKey: "week" | "month" | "year"): string {
  if (!date) return routeColorScales[periodKey][0]

  const routeDate = new Date(date)
  const now = new Date()
  const colors = routeColorScales[periodKey]

  switch (periodKey) {
    case "week": {
      const weeksDiff = Math.floor((now.getTime() - routeDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
      return colors[Math.min(weeksDiff, colors.length - 1)]
    }
    case "month": {
      const monthsDiff = (now.getFullYear() - routeDate.getFullYear()) * 12 + (now.getMonth() - routeDate.getMonth())
      return colors[Math.min(monthsDiff, colors.length - 1)]
    }
    case "year": {
      const yearsDiff = now.getFullYear() - routeDate.getFullYear()
      return colors[Math.min(yearsDiff, colors.length - 1)]
    }
    default:
      return colors[0]
  }
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
