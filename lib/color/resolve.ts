import { getRouteColor } from "@/lib/color/scales"

type RouteLike = {
  color?: string | null
  createdAt?: string | null
  date?: string | null
}

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

