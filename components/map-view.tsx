"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { MapIcon, Layers, Eye, EyeOff, Palette, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Route } from "@/lib/types"
import { getRouteColor, getPeriodLabel, routeColorScales } from "@/lib/color/scales"
import {
  simplifyGeoJSONCoordinates,
  getToleranceForZoom,
  intersectsBounds,
  calculateBounds,
} from "@/lib/performance/geometry"
import { performanceMonitor, type PerformanceMetrics } from "@/lib/performance/monitor"

// Leaflet imports (dynamic to avoid SSR issues)
let L: any = null
let leafletLoaded = false

interface MapViewProps {
  routes: Route[]
  className?: string
}

interface LayerState {
  [routeId: string]: {
    visible: boolean
    layer?: any
    bounds?: [number, number, number, number]
    originalCoordinates?: number[][][]
    simplifiedCoordinates?: number[][][]
    lastZoom?: number
  }
}

const PERFORMANCE_THRESHOLDS = {
  MAX_POINTS_PER_ROUTE: 1000, // Simplify routes with more points
  MAX_VISIBLE_ROUTES: 50, // Limit visible routes for performance
  MIN_ZOOM_FOR_DETAIL: 10, // Show full detail only at high zoom
  RENDER_DEBOUNCE_MS: 100, // Debounce render updates
}

export function MapView({ routes, className }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const renderTimeoutRef = useRef<NodeJS.Timeout>()
  const [isLoading, setIsLoading] = useState(true)
  const [layerStates, setLayerStates] = useState<LayerState>({})
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [colorMode, setColorMode] = useState<"week" | "month" | "year">("month")
  const [allVisible, setAllVisible] = useState(true)
  const [currentZoom, setCurrentZoom] = useState(6)
  const [viewBounds, setViewBounds] = useState<[number, number, number, number]>([0, 0, 0, 0])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [showPerformanceInfo, setShowPerformanceInfo] = useState(false)

  const processedRoutes = useMemo(() => {
    return routes.map((route) => {
      const bounds =
        route.geojson.features.length > 0
          ? calculateBounds(route.geojson.features[0].geometry.coordinates as number[][])
          : ([0, 0, 0, 0] as [number, number, number, number])

      return {
        ...route,
        bounds,
        pointCount: route.geojson.features.reduce((acc, f) => acc + (f.geometry.coordinates?.length || 0), 0),
      }
    })
  }, [routes])

  const visibleRoutes = useMemo(() => {
    const filtered = processedRoutes.filter((route) => {
      // Check if route intersects with current viewport
      return intersectsBounds(route.bounds, viewBounds)
    })

    // Sort by distance from viewport center for priority rendering
    const [minLon, minLat, maxLon, maxLat] = viewBounds
    const centerLon = (minLon + maxLon) / 2
    const centerLat = (minLat + maxLat) / 2

    filtered.sort((a, b) => {
      const [aMinLon, aMinLat, aMaxLon, aMaxLat] = a.bounds
      const [bMinLon, bMinLat, bMaxLon, bMaxLat] = b.bounds

      const aCenterLon = (aMinLon + aMaxLon) / 2
      const aCenterLat = (aMinLat + aMaxLat) / 2
      const bCenterLon = (bMinLon + bMaxLon) / 2
      const bCenterLat = (bMinLat + bMaxLat) / 2

      const aDist = Math.sqrt((aCenterLon - centerLon) ** 2 + (aCenterLat - centerLat) ** 2)
      const bDist = Math.sqrt((bCenterLon - centerLon) ** 2 + (bCenterLat - centerLat) ** 2)

      return aDist - bDist
    })

    // Limit number of visible routes for performance
    return filtered.slice(0, PERFORMANCE_THRESHOLDS.MAX_VISIBLE_ROUTES)
  }, [processedRoutes, viewBounds])

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (leafletLoaded) return

      try {
        // Import Leaflet CSS
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)

        // Import Leaflet JS
        const leafletModule = await import("leaflet")
        L = leafletModule.default

        // Fix default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        })

        leafletLoaded = true
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load Leaflet:", error)
        setIsLoading(false)
      }
    }

    loadLeaflet()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return

    try {
      const map = L.map(mapRef.current, {
        center: [51.1657, 10.4515], // Center of Germany
        zoom: 6,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true, // Use canvas for better performance with many layers
        zoomSnap: 0.5, // Allow fractional zoom for smoother experience
        wheelPxPerZoomLevel: 120, // Smoother zoom with mouse wheel
      })

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
        keepBuffer: 2, // Keep tiles in buffer for smoother panning
        updateWhenZooming: false, // Don't update tiles while zooming
      }).addTo(map)

      map.on("zoomend", () => {
        const zoom = map.getZoom()
        setCurrentZoom(zoom)
        updateViewBounds(map)
      })

      map.on("moveend", () => {
        updateViewBounds(map)
      })

      mapInstanceRef.current = map
      setCurrentZoom(6)
      updateViewBounds(map)

      // Initialize layer states
      const initialStates: LayerState = {}
      routes.forEach((route) => {
        initialStates[route.id] = { visible: true }
      })
      setLayerStates(initialStates)
    } catch (error) {
      console.error("Failed to initialize map:", error)
    }
  }, [L, routes])

  const updateViewBounds = useCallback((map: any) => {
    const bounds = map.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    setViewBounds([sw.lng, sw.lat, ne.lng, ne.lat])
  }, [])

  useEffect(() => {
    if (!L || !mapInstanceRef.current || visibleRoutes.length === 0) return

    // Clear existing timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current)
    }

    // Debounce render updates
    renderTimeoutRef.current = setTimeout(() => {
      const startTime = performanceMonitor.startRender()
      const map = mapInstanceRef.current
      const bounds = L.latLngBounds([])
      let totalPoints = 0

      // Clear existing layers
      Object.values(layerStates).forEach((state) => {
        if (state.layer) {
          map.removeLayer(state.layer)
        }
      })

      const newLayerStates: LayerState = {}
      const tolerance = getToleranceForZoom(currentZoom)

      visibleRoutes.forEach((route) => {
        try {
          // Get color for route based on current color mode
          const color = route.color || getRouteColor(route.date, colorMode)

          let processedGeoJSON = { ...route.geojson }

          if (
            route.pointCount > PERFORMANCE_THRESHOLDS.MAX_POINTS_PER_ROUTE ||
            currentZoom < PERFORMANCE_THRESHOLDS.MIN_ZOOM_FOR_DETAIL
          ) {
            processedGeoJSON = {
              ...route.geojson,
              features: route.geojson.features.map((feature) => {
                if (feature.geometry.type === "LineString") {
                  const simplified = simplifyGeoJSONCoordinates(
                    feature.geometry.coordinates as number[][],
                    tolerance,
                    currentZoom > PERFORMANCE_THRESHOLDS.MIN_ZOOM_FOR_DETAIL,
                  )
                  totalPoints += simplified.length

                  return {
                    ...feature,
                    geometry: {
                      ...feature.geometry,
                      coordinates: simplified,
                    },
                  }
                }
                return feature
              }),
            }
          } else {
            totalPoints += route.pointCount
          }

          // Create GeoJSON layer with optimized styling
          const layer = L.geoJSON(processedGeoJSON, {
            style: {
              color: color,
              weight: currentZoom > 12 ? 3 : 2, // Thinner lines at low zoom
              opacity: 0.8,
              lineCap: "round",
              lineJoin: "round",
            },
            onEachFeature: (feature: any, layer: any) => {
              const popupContent = `
                <div class="p-2">
                  <h3 class="font-semibold text-sm">${route.name}</h3>
                  <div class="text-xs text-gray-600 mt-1">
                    ${route.stats.distance_km ? `${route.stats.distance_km.toFixed(1)} km` : ""}
                    ${route.stats.duration_h ? ` • ${route.stats.duration_h.toFixed(1)}h` : ""}
                    ${route.date ? ` • ${new Date(route.date).toLocaleDateString("de-DE")}` : ""}
                  </div>
                </div>
              `
              layer.bindPopup(popupContent, {
                maxWidth: 200,
                closeButton: false,
                autoPan: false, // Disable auto-pan for performance
              })
            },
          })

          // Add to bounds for auto-fitting
          if (processedGeoJSON.features.length > 0) {
            layer.eachLayer((l: any) => {
              if (l.getBounds) {
                bounds.extend(l.getBounds())
              }
            })
          }

          newLayerStates[route.id] = {
            visible: layerStates[route.id]?.visible ?? true,
            layer,
            bounds: route.bounds,
          }

          // Add to map if visible
          if (newLayerStates[route.id].visible) {
            layer.addTo(map)
          }
        } catch (error) {
          console.error(`Failed to create layer for route ${route.id}:`, error)
          newLayerStates[route.id] = { visible: false }
        }
      })

      setLayerStates(newLayerStates)

      const metrics = performanceMonitor.endRender(startTime, visibleRoutes.length, totalPoints)
      setPerformanceMetrics(metrics)

      // Log performance warnings if needed
      performanceMonitor.logPerformanceWarning()

      // Fit map to show all routes (only on initial load)
      if (bounds.isValid() && visibleRoutes.length === routes.length) {
        map.fitBounds(bounds, { padding: [20, 20] })
      }
    }, PERFORMANCE_THRESHOLDS.RENDER_DEBOUNCE_MS)

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current)
      }
    }
  }, [visibleRoutes, colorMode, currentZoom, L, layerStates])

  const toggleLayerVisibility = useCallback((routeId: string) => {
    if (!mapInstanceRef.current) return

    setLayerStates((prev) => {
      const newStates = { ...prev }
      const state = newStates[routeId]

      if (state?.layer) {
        if (state.visible) {
          mapInstanceRef.current.removeLayer(state.layer)
        } else {
          state.layer.addTo(mapInstanceRef.current)
        }
        state.visible = !state.visible
      }

      return newStates
    })
  }, [])

  const toggleAllLayers = useCallback(() => {
    if (!mapInstanceRef.current) return

    const newVisibility = !allVisible

    setLayerStates((prev) => {
      const newStates = { ...prev }

      Object.keys(newStates).forEach((routeId) => {
        const state = newStates[routeId]
        if (state?.layer) {
          if (newVisibility && !state.visible) {
            state.layer.addTo(mapInstanceRef.current)
          } else if (!newVisibility && state.visible) {
            mapInstanceRef.current.removeLayer(state.layer)
          }
          state.visible = newVisibility
        }
      })

      return newStates
    })

    setAllVisible(newVisibility)
  }, [allVisible])

  const actuallyVisibleRoutes = visibleRoutes.filter((route) => layerStates[route.id]?.visible)
  const colorCounts = actuallyVisibleRoutes.reduce(
    (acc, route) => {
      const color = route.color || getRouteColor(route.date, colorMode)
      acc[color] = (acc[color] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg", className)}>
        <div className="text-center">
          <MapIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Karte wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="bg-card shadow-md"
        >
          <Layers className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowPerformanceInfo(!showPerformanceInfo)}
          className="bg-card shadow-md"
        >
          <Activity className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer Panel */}
      {showLayerPanel && (
        <Card className="absolute top-4 left-4 w-80 max-h-96 overflow-hidden shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center justify-between">
              <span>Layer-Kontrolle</span>
              <Button variant="ghost" size="sm" onClick={() => setShowLayerPanel(false)}>
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Mode Selection */}
            <div className="space-y-2">
              <Label className="text-xs">Farbmodus</Label>
              <Select value={colorMode} onValueChange={(value: "week" | "month" | "year") => setColorMode(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Woche</SelectItem>
                  <SelectItem value="month">Monat</SelectItem>
                  <SelectItem value="year">Jahr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* All On/Off Toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Alle Routen</Label>
              <Switch checked={allVisible} onCheckedChange={toggleAllLayers} />
            </div>

            {/* Color Legend */}
            <div className="space-y-2">
              <Label className="text-xs">Legende</Label>
              <div className="space-y-1">
                {routeColorScales[colorMode].map((color, index) => {
                  const count = colorCounts[color] || 0
                  if (count === 0) return null

                  return (
                    <div key={color} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: color }} />
                      <span className="flex-1">{getPeriodLabel(colorMode, index)}</span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Route List */}
            <div className="space-y-2">
              <Label className="text-xs">Routen ({routes.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {visibleRoutes.map((route) => {
                  const isVisible = layerStates[route.id]?.visible ?? false
                  const color = route.color || getRouteColor(route.date, colorMode)

                  return (
                    <div key={route.id} className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => toggleLayerVisibility(route.id)}
                        className="flex items-center gap-2 flex-1 text-left hover:bg-muted p-1 rounded"
                      >
                        {isVisible ? (
                          <Eye className="h-3 w-3 text-primary" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                        <div className="w-2 h-2 rounded-full border" style={{ backgroundColor: color }} />
                        <span className="truncate">{route.name}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showPerformanceInfo && performanceMetrics && (
        <Card className="absolute top-4 left-4 w-64 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center justify-between">
              <span>Performance</span>
              <Button variant="ghost" size="sm" onClick={() => setShowPerformanceInfo(false)}>
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Render Zeit:</span>
              <span className={performanceMetrics.renderTime > 16 ? "text-destructive" : "text-primary"}>
                {performanceMetrics.renderTime.toFixed(1)}ms
              </span>
            </div>
            {performanceMetrics.fps && (
              <div className="flex justify-between">
                <span>FPS:</span>
                <span className={performanceMetrics.fps < 30 ? "text-destructive" : "text-primary"}>
                  {performanceMetrics.fps.toFixed(1)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Sichtbare Routen:</span>
              <span>{performanceMetrics.routeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Punkte:</span>
              <span>{performanceMetrics.pointCount.toLocaleString()}</span>
            </div>
            {performanceMetrics.memoryUsage && (
              <div className="flex justify-between">
                <span>Speicher:</span>
                <span>{performanceMetrics.memoryUsage.toFixed(1)}MB</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Zoom:</span>
              <span>{currentZoom.toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {actuallyVisibleRoutes.length} von {routes.length} Routen sichtbar
              {visibleRoutes.length < routes.length && (
                <span className="text-orange-500 ml-1">({routes.length - visibleRoutes.length} außerhalb Ansicht)</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Palette className="h-3 w-3" />
              <span>{colorMode}</span>
              {performanceMetrics && performanceMonitor.shouldOptimize() && (
                <Badge variant="outline" className="text-xs text-orange-500">
                  Optimiert
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
