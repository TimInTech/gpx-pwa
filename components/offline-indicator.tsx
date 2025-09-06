"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [cacheStatus, setCacheStatus] = useState<"checking" | "cached" | "error" | null>(null)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
      checkForUpdates()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineMessage(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false)
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      registerServiceWorker()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      setCacheStatus("checking")
      console.log("[v0] Starting service worker registration at /api/sw")

      const testResponse = await fetch("/api/sw")
      console.log("[v0] Test fetch response status:", testResponse.status)
      console.log("[v0] Test fetch response headers:", Object.fromEntries(testResponse.headers.entries()))
      console.log("[v0] Test fetch content type:", testResponse.headers.get("content-type"))

      const testText = await testResponse.text()
      console.log("[v0] Test fetch response length:", testText.length)
      console.log("[v0] Test fetch response starts with:", testText.substring(0, 100))

      const registration = await navigator.serviceWorker.register("/api/sw", {
        scope: "/",
      })

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content is available
              setCacheStatus("cached")
              console.log("New content is available; please refresh.")
            }
          })
        }
      })

      // Check for updates
      registration.update()
      setCacheStatus("cached")

      console.log("[v0] Service Worker registered successfully")
    } catch (error) {
      console.error("[v0] Service Worker registration failed:", error)
      setCacheStatus("error")
    }
  }

  const checkForUpdates = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          registration.update()
        }
      } catch (error) {
        console.error("Failed to check for updates:", error)
      }
    }
  }

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        setIsInstallable(false)
        setDeferredPrompt(null)
      }
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className={cn("fixed top-4 left-1/2 transform -translate-x-1/2 z-50", className)}>
      {/* Offline Message */}
      {showOfflineMessage && (
        <Card className="mb-2 border-orange-200 bg-orange-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <WifiOff className="h-4 w-4 text-orange-600" />
              <span className="text-orange-800">
                Sie sind offline. Die App funktioniert weiterhin mit gespeicherten Daten.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Install Prompt */}
      {isInstallable && (
        <Card className="mb-2 border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <span className="text-primary">App installieren für bessere Offline-Nutzung</span>
              </div>
              <Button size="sm" onClick={handleInstallApp} className="h-7">
                Installieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Status */}
      {cacheStatus && (
        <Card className="mb-2">
          <CardContent className="p-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-green-600" />
                ) : (
                  <WifiOff className="h-3 w-3 text-orange-600" />
                )}
                <span className="text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={cacheStatus === "cached" ? "default" : cacheStatus === "error" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {cacheStatus === "checking" && "Caching..."}
                  {cacheStatus === "cached" && "Cached"}
                  {cacheStatus === "error" && "Cache Error"}
                </Badge>

                {isOnline && (
                  <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-6 w-6 p-0">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
