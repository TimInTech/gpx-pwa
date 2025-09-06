"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

import { BottomNavigation } from "@/components/bottom-navigation"
import { GPXImport } from "@/components/gpx-import"
import { RouteManagement } from "@/components/route-management"
import { OfflineIndicator } from "@/components/offline-indicator"
import type { ViewMode, Route } from "@/lib/types"
import { gpxStorage } from "@/lib/storage/db"

// WICHTIG: named export korrekt auflösen + SSR aus
const MapView = dynamic(
  () => import("@/components/map-view").then((m) => m.MapView),
                        { ssr: false }
)

export default function HomePage() {
  const [activeView, setActiveView] = useState<ViewMode>("map")
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    setActiveView("map")
  }

  const handleRoutesChange = (updatedRoutes: Route[]) => {
    setRoutes(updatedRoutes)
  }

  return (
    <div className="min-h-screen bg-background">
    <OfflineIndicator />

    <header className="bg-card border-b border-border px-4 py-3">
    <h1 className="text-xl font-bold text-foreground font-heading">GPX Route Manager</h1>
    </header>

    <main className="pb-20">
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
      <RouteManagement
      routes={routes}
      onRoutesChange={handleRoutesChange}
      isLoading={isLoading}
      />
    )}

    {activeView === "import" && <GPXImport onImportComplete={handleImportComplete} />}
    </main>

    <BottomNavigation activeView={activeView} onViewChange={setActiveView} />
    </div>
  )
}
