"use client"

import { resolveRouteColor } from "@/lib/color/resolve"
import { useState, useMemo, useCallback } from "react"
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Route, FilterOptions } from "@/lib/types"
import { getRouteColor } from "@/lib/color/scales"
import { gpxStorage } from "@/lib/storage/db"

interface RouteManagementProps {
  routes: Route[]
  onRoutesChange: (routes: Route[]) => void
  isLoading?: boolean
}

export function RouteManagement({ routes, onRoutesChange, isLoading }: RouteManagementProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"date" | "name" | "distance" | "duration">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filters, setFilters] = useState<FilterOptions>({})
  const [showFilters, setShowFilters] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [showRouteDetails, setShowRouteDetails] = useState<Route | null>(null)

  // Filter and sort routes
  const filteredAndSortedRoutes = useMemo(() => {
    const filtered = routes.filter((route) => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!route.name.toLowerCase().includes(query) && !route.category?.toLowerCase().includes(query)) {
          return false
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const routeDate = route.date ? new Date(route.date) : null
        if (routeDate) {
          const start = new Date(filters.dateRange.start)
          const end = new Date(filters.dateRange.end)
          if (routeDate < start || routeDate > end) {
            return false
          }
        }
      }

      // Distance range filter
      if (filters.distanceRange && route.stats.distance_km) {
        if (
          route.stats.distance_km < filters.distanceRange.min ||
          route.stats.distance_km > filters.distanceRange.max
        ) {
          return false
        }
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!route.category || !filters.categories.includes(route.category)) {
          return false
        }
      }

      return true
    })

    // Sort routes
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "date":
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0
          comparison = dateA - dateB
          break
        case "distance":
          const distA = a.stats.distance_km || 0
          const distB = b.stats.distance_km || 0
          comparison = distA - distB
          break
        case "duration":
          const durA = a.stats.duration_h || 0
          const durB = b.stats.duration_h || 0
          comparison = durA - durB
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [routes, searchQuery, filters, sortBy, sortOrder])

  const handleSelectRoute = useCallback((routeId: string, selected: boolean) => {
    setSelectedRoutes((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(routeId)
      } else {
        newSet.delete(routeId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedRoutes(new Set(filteredAndSortedRoutes.map((r) => r.id)))
      } else {
        setSelectedRoutes(new Set())
      }
    },
    [filteredAndSortedRoutes],
  )

  const handleDeleteRoute = useCallback(
    async (routeId: string) => {
      if (!confirm("Route wirklich löschen?")) return

      try {
        await gpxStorage.deleteRoute(routeId)
        const updatedRoutes = routes.filter((r) => r.id !== routeId)
        onRoutesChange(updatedRoutes)
        setSelectedRoutes((prev) => {
          const newSet = new Set(prev)
          newSet.delete(routeId)
          return newSet
        })
      } catch (error) {
        console.error("Failed to delete route:", error)
        alert("Fehler beim Löschen der Route.")
      }
    },
    [routes, onRoutesChange],
  )

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRoutes.size === 0) return
    if (!confirm(`${selectedRoutes.size} Routen wirklich löschen?`)) return

    try {
      for (const routeId of selectedRoutes) {
        await gpxStorage.deleteRoute(routeId)
      }
      const updatedRoutes = routes.filter((r) => !selectedRoutes.has(r.id))
      onRoutesChange(updatedRoutes)
      setSelectedRoutes(new Set())
    } catch (error) {
      console.error("Failed to delete routes:", error)
      alert("Fehler beim Löschen der Routen.")
    }
  }, [selectedRoutes, routes, onRoutesChange])

  const handleExportSelected = useCallback(async () => {
    if (selectedRoutes.size === 0) return

    try {
      const selectedRouteData = routes.filter((r) => selectedRoutes.has(r.id))

      if (selectedRoutes.size === 1) {
        // Export single route as GPX
        const route = selectedRouteData[0]
        const gpxContent = convertRouteToGPX(route)
        downloadFile(gpxContent, `${route.name}.gpx`, "application/gpx+xml")
      } else {
        // Export multiple routes as JSON backup
        const backup = {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          routes: selectedRouteData,
        }
        const jsonContent = JSON.stringify(backup, null, 2)
        downloadFile(jsonContent, `routes-backup-${new Date().toISOString().split("T")[0]}.json`, "application/json")
      }
    } catch (error) {
      console.error("Failed to export routes:", error)
      alert("Fehler beim Exportieren der Routen.")
    }
  }, [selectedRoutes, routes])

  const handleUpdateRoute = useCallback(
    async (updatedRoute: Route) => {
      try {
        // Update in storage (assuming we have an update method)
        await gpxStorage.deleteRoute(updatedRoute.id)
        await gpxStorage.addRoute(updatedRoute)

        const updatedRoutes = routes.map((r) => (r.id === updatedRoute.id ? updatedRoute : r))
        onRoutesChange(updatedRoutes)
        setEditingRoute(null)
      } catch (error) {
        console.error("Failed to update route:", error)
        alert("Fehler beim Aktualisieren der Route.")
      }
    },
    [routes, onRoutesChange],
  )

  // Get unique categories for filter
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    routes.forEach((route) => {
      if (route.category) categories.add(route.category)
    })
    return Array.from(categories).sort()
  }, [routes])

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="bg-card rounded-lg p-6 text-center">
          <p className="text-muted-foreground">Routen werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-heading">Meine Routen</h2>
        <div className="flex items-center gap-2">
          {selectedRoutes.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportSelected}>
                <Download className="h-4 w-4 mr-1" />
                Export ({selectedRoutes.size})
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="h-4 w-4 mr-1" />
                Löschen ({selectedRoutes.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Routen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Sortieren nach</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Datum</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="distance">Distanz</SelectItem>
                    <SelectItem value="duration">Dauer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reihenfolge</Label>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Absteigend</SelectItem>
                    <SelectItem value="asc">Aufsteigend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {availableCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select
                    value={filters.categories?.[0] || "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        categories: value === "all" ? undefined : [value],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alle Kategorien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kategorien</SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route List */}
      {filteredAndSortedRoutes.length === 0 ? (
        <div className="bg-card rounded-lg p-6 text-center">
          <p className="text-muted-foreground">
            {routes.length === 0 ? "Noch keine Routen importiert" : "Keine Routen gefunden"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              checked={selectedRoutes.size === filteredAndSortedRoutes.length}
              onCheckedChange={handleSelectAll}
            />
            <Label className="text-sm text-muted-foreground">
              Alle auswählen ({filteredAndSortedRoutes.length} Routen)
            </Label>
          </div>

          {/* Route Cards */}
          {filteredAndSortedRoutes.map((route) => {
            const color = route.color || resolveRouteColor(route, "month")
            const isSelected = selectedRoutes.has(route.id)

            return (
              <Card key={route.id} className={cn("transition-colors", isSelected && "ring-2 ring-primary")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectRoute(route.id, checked as boolean)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: resolveRouteColor(route, "month")}} />
                            <h3 className="font-semibold font-heading truncate">{route.name}</h3>
                            {route.category && (
                              <Badge variant="outline" className="text-xs">
                                {route.category}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            { Number.isFinite(route.stats?.distance_km as number) && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {(route.stats?.distance_km as number).toFixed(1)} km
                              </div>
                            )}
                            { Number.isFinite(route.stats?.duration_h as number) && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {(route.stats?.duration_h as number).toFixed(1)}h
                              </div>
                            )}
                            { Number.isFinite(route.stats?.elevation_gain as number) && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />+{Math.round(Number(route.stats?.elevation_gain))}m
                              </div>
                            )}
                            {route.date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(route.date).toLocaleDateString("de-DE")}
                              </div>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setShowRouteDetails(route)}>
                              Details anzeigen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingRoute(route)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteRoute(route.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Route Details Dialog */}
      {showRouteDetails && <RouteDetailsDialog route={showRouteDetails} onClose={() => setShowRouteDetails(null)} />}

      {/* Edit Route Dialog */}
      {editingRoute && (
        <EditRouteDialog route={editingRoute} onSave={handleUpdateRoute} onClose={() => setEditingRoute(null)} />
      )}
    </div>
  )
}

// Helper function to convert route to GPX format
function convertRouteToGPX(route: Route): string {
  const features = route.geojson.features
  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Route Manager">
  <metadata>
    <name>${route.name}</name>
    ${route.date ? `<time>${route.date}</time>` : ""}
  </metadata>
  <trk>
    <name>${route.name}</name>`

  features.forEach((feature) => {
    if (feature.geometry.type === "LineString") {
      gpxContent += `
    <trkseg>`
      feature.geometry.coordinates.forEach((coord) => {
        const [lon, lat, ele] = coord
        gpxContent += `
      <trkpt lat="${lat}" lon="${lon}"${ele ? ` ele="${ele}"` : ""}></trkpt>`
      })
      gpxContent += `
    </trkseg>`
    }
  })

  gpxContent += `
  </trk>
</gpx>`

  return gpxContent
}

// Helper function to download file
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Route Details Dialog Component
function RouteDetailsDialog({ route, onClose }: { route: Route; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{route.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            { Number.isFinite(route.stats?.distance_km as number) && (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{(route.stats?.distance_km as number).toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">km</div>
              </div>
            )}
            { Number.isFinite(route.stats?.duration_h as number) && (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{(route.stats?.duration_h as number).toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Stunden</div>
              </div>
            )}
            { Number.isFinite(route.stats?.elevation_gain as number) && (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{Math.round(Number(route.stats?.elevation_gain))}</div>
                <div className="text-sm text-muted-foreground">m Aufstieg</div>
              </div>
            )}
            { Number.isFinite(route.stats?.avg_speed as number) && (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{(route.stats?.avg_speed as number).toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">km/h</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Informationen</Label>
            <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
              {route.date && <div>Datum: {new Date(route.date).toLocaleDateString("de-DE")}</div>}
              {route.category && <div>Kategorie: {route.category}</div>}
              <div>Erstellt: {new Date(route.created_at).toLocaleDateString("de-DE")}</div>
              <div>
                Punkte: {route.geojson.features.reduce((acc, f) => acc + (f.geometry.coordinates?.length || 0), 0)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Edit Route Dialog Component
function EditRouteDialog({
  route,
  onSave,
  onClose,
}: { route: Route; onSave: (route: Route) => void; onClose: () => void }) {
  const [name, setName] = useState(route.name)
  const [category, setCategory] = useState(route.category || "")
  const [color, setColor] = useState(route.color || resolveRouteColor(route, "month"))

  const handleSave = () => {
    const updatedRoute: Route = {
      ...route,
      name,
      category: category || null,
      color,
      updated_at: new Date().toISOString(),
    }
    onSave(updatedRoute)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Route bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Kategorie</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex items-center gap-2">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-20 h-10" />
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: resolveRouteColor(route, "month")}} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>Speichern</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
