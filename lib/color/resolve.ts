import { getRouteColor } from "@/lib/color/scales"

type RouteLike = {
  color?: string | null
  createdAt?: string | null
  date?: string | null
}

/**
 * Nimmt – falls vorhanden – die manuell gesetzte route.color.
 * Sonst Auto-Farbe aus getRouteColor(date, periodKey).
 */
export function resolveRouteColor(
  route: RouteLike | null | undefined,
  periodKey: "week" | "month" | "year" = "month",
  fallbackDate?: string | null,
): string {
  const manual = route?.color?.trim()
  if (manual) return manual
  const date = route?.createdAt ?? route?.date ?? fallbackDate ?? null
  return getRouteColor(date, periodKey)
}

