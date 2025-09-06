"use client"

import { useState, useEffect } from "react"
import { BottomNavigation } from "@/components/bottom-navigation"
import { GPXImport } from "@/components/gpx-import"
import { MapView } from "@/components/map-view"
import { RouteManagement } from "@/components/route-management"
import { OfflineIndicator } from "@/components/offline-indicator"
import type { ViewMode, Route } from "@/lib/types"
import { gpxStorage } from "@/lib/storage/db"

export default function HomePage() {
  const [activeView, setActiveView] = useState<ViewMode>("map")
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load routes from storage on mount
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const storedRoutes = await gpxStorage.getAllRoutes()
        setRoutes(storedRoutes)
      } catch (error) {
        console.error("Failed to load routes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRoutes()
  }, [])

  const handleImportComplete = (newRoutes: Route[]) => {
    setRoutes((prev) => [...prev, ...newRoutes])
    // Switch to map view to show imported routes
    setActiveView("map")
  }

  const handleRoutesChange = (updatedRoutes: Route[]) => {
    setRoutes(updatedRoutes)
  }

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold text-foreground font-heading">GPX Route Manager</h1>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {" "}
        {/* Bottom padding for navigation */}
        {activeView === "map" && (
          <div className="h-[calc(100vh-8rem)]">
            {isLoading ? (
              <div className="h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Routen werden geladen...</p>
              </div>
            ) : (
              <MapView routes={routes} className="h-full" />
            )}
          </div>
        )}
        {activeView === "routes" && (
          <RouteManagement routes={routes} onRoutesChange={handleRoutesChange} isLoading={isLoading} />
        )}
        {activeView === "import" && <GPXImport onImportComplete={handleImportComplete} />}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeView={activeView} onViewChange={setActiveView} />
    </div>
  )
}
