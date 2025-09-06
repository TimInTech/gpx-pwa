// lib/types.ts

export type ViewMode = "map" | "routes" | "import"

export type TrackPoint = {
  lat: number
  lon: number
  ele?: number
  time?: string
}

export type RouteStats = {
  distance_km?: number
  duration_h?: number
  elevation_gain?: number
  avg_speed?: number
}

export type GeoJSONLineString = {
  type: "LineString"
  coordinates: number[][] // [lon, lat, ele?][]
}

export type GeoJSONMultiLineString = {
  type: "MultiLineString"
  coordinates: number[][][]
}

export type GeoJSONFeature = {
  type: "Feature"
  geometry: GeoJSONLineString | GeoJSONMultiLineString
  properties?: Record<string, unknown>
}

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection"
  features: GeoJSONFeature[]
}

export type Route = {
  id: string
  name: string
  color?: string | null
  category?: string | null
  date?: string | null
  period_key?: "week" | "month" | "year"
  created_at: string
  updated_at?: string
  // Either points or geojson may be present depending on pipeline stage
  points?: TrackPoint[]
  geojson: GeoJSONFeatureCollection
  stats: RouteStats
}

export type ImportOptions = {
  colorMode: "auto" | "manual"
  defaultColor: string
  periodGrouping: "week" | "month" | "year"
  mergeIdenticalTracks: boolean
}

export type FilterOptions = {
  dateRange?: { start: string; end: string }
  distanceRange?: { min: number; max: number }
  categories?: string[]
}

