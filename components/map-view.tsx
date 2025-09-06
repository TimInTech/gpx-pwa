// components/map-view.tsx
"use client"

import { useEffect, useRef } from "react"
import type { Route } from "@/lib/types"

let L: any
let leafletLoaded = false

type Props = { routes?: Route[]; className?: string }

export default function MapView({ routes, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const winResizeRef = useRef<(() => void) | null>(null)

  // einmalige Initialisierung
  useEffect(() => {
    let cancelled = false

    const ensureLeafletCSS = () =>
    new Promise<void>((resolve) => {
      const id = "leaflet-css"
      if (document.getElementById(id)) return resolve()
        const link = document.createElement("link")
        link.id = id
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.onload = () => resolve()
        link.onerror = () => resolve()
        document.head.appendChild(link)
    })

    const safeInvalidate = () => {
      const el = hostRef.current
      const m = mapRef.current
      if (!el || !el.isConnected) return
        if (!m || !(m as any)._loaded || !(m as any)._mapPane) return
          try { m.invalidateSize() } catch {}
    }

    ;(async () => {
      if (typeof window === "undefined") return
        const host = hostRef.current
        if (cancelled || mapRef.current || !host) return

          await ensureLeafletCSS()

          if (!leafletLoaded) {
            const mod = await import("leaflet")
            L = mod.default
            L.Icon.Default.mergeOptions({
              iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
              iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            })
            leafletLoaded = true
          }

          if (host.clientHeight === 0) host.style.minHeight = "60vh"

            const SavedRO = (window as any).ResizeObserver
            ;(window as any).ResizeObserver = undefined
            let map: any
            try {
              map = L.map(host, { center: [51.96, 8.7], zoom: 12 })
            } finally {
              ;(window as any).ResizeObserver = SavedRO
            }

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "&copy; OpenStreetMap contributors",
              maxZoom: 19,
            }).addTo(map)

            mapRef.current = map

            setTimeout(safeInvalidate, 0)
            const onWinResize = () => safeInvalidate()
            winResizeRef.current = onWinResize
            window.addEventListener("resize", onWinResize)

            const ro = new ResizeObserver(() => safeInvalidate())
            ro.observe(host)
            roRef.current = ro
    })()

    return () => {
      cancelled = true
      if (winResizeRef.current) {
        window.removeEventListener("resize", winResizeRef.current)
        winResizeRef.current = null
      }
      // vor Remove Pointer-Events kappen, um Race bei mousedown zu verhindern
      if (hostRef.current) hostRef.current.style.pointerEvents = "none"
        if (roRef.current && hostRef.current) {
          try { roRef.current.unobserve(hostRef.current) } catch {}
          roRef.current.disconnect()
          roRef.current = null
        }
        if (mapRef.current) {
          try { mapRef.current.remove() } finally { mapRef.current = null }
        }
    }
  }, []) // WICHTIG: keine Abhängigkeit zu routes

  // (optional) spätere Routen-Zeichnung hier ergänzen, ohne die Map neu zu erstellen
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
      // TODO: Routen als Layer hinzufügen/aktualisieren
  }, [routes])

  return (
    <div className={className ?? "w-full h-[calc(100vh-112px)]"}>
    <div ref={hostRef} className="w-full h-full rounded-lg overflow-hidden border" />
    </div>
  )
}
