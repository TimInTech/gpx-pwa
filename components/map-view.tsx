"use client"

import { useEffect, useRef } from "react"
import type { Route } from "@/lib/types"

let L: any | null = null
let leafletLoadPromise: Promise<void> | null = null

async function ensureLeaflet() {
  if (L) return
    if (!leafletLoadPromise) {
      leafletLoadPromise = (async () => {
        // CSS nur einmal injizieren
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link")
          link.id = "leaflet-css"
          link.rel = "stylesheet"
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          document.head.appendChild(link)
        }
        const mod = await import("leaflet")
        L = mod.default || mod

        // Marker-Icons fixen (CDN-URLs)
        const icon = L.icon({
          iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          tooltipAnchor: [16, -28],
          shadowSize: [41, 41],
        })
        L.Marker.prototype.options.icon = icon
      })()
    }
    await leafletLoadPromise
}

type Props = {
  routes: Route[]
  className?: string
}

export function MapView({ routes, className }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const groupRef = useRef<any>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  // einmalig: Map anlegen (oder wiederverwenden)
  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return

      ;(async () => {
        await ensureLeaflet()
        if (cancelled || !host) return

          // Reuse bei StrictMode/HMR: Map-Instanz am Host parken
          const existing = (host as any)._leaflet_map
          if (existing) {
            mapRef.current = existing
            groupRef.current = (host as any)._leaflet_group || L.layerGroup().addTo(existing)
            ;(host as any)._leaflet_group = groupRef.current
            setTimeout(() => mapRef.current?.invalidateSize(), 0)
          } else {
            const map = L.map(host, { center: [51.96, 8.7], zoom: 12, zoomControl: true })
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "&copy; OSM contributors",
              maxZoom: 19,
            }).addTo(map)

            const group = L.layerGroup().addTo(map)

            ;(host as any)._leaflet_map = map
            ;(host as any)._leaflet_group = group

            mapRef.current = map
            groupRef.current = group

            const ro = new ResizeObserver(() => {
              if (host.isConnected) map.invalidateSize()
            })
            ro.observe(host)
            roRef.current = ro

            setTimeout(() => map.invalidateSize(), 0)
          }

          // initiale Routen zeichnen
          redrawRoutes()
      })()

      function redrawRoutes() {
        const map = mapRef.current
        const group = groupRef.current
        if (!map || !group || !L) return
          group.clearLayers()
          for (const r of routes) {
            if (!r?.points?.length) continue
              const latlngs = r.points.map((p) => [p.lat, p.lon]) as [number, number][]
              L.polyline(latlngs).addTo(group)
          }
          // optional: auf erste Route zoomen
          const first = routes.find((r) => r.points?.length)
          if (first) {
            const latlngs = first.points.map((p) => [p.lat, p.lon])
            try {
              map.fitBounds(L.latLngBounds(latlngs as any), { padding: [20, 20] })
            } catch {}
          }
      }

      return () => {
        cancelled = true
        // Keine harte Map-Entfernung in Dev (StrictMode doppelt) → Instanz bleibt für Reuse.
        if (roRef.current) {
          try {
            roRef.current.disconnect()
          } catch {}
          roRef.current = null
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Routen-Updates in LayerGroup anwenden
  useEffect(() => {
    const map = mapRef.current
    const group = groupRef.current
    if (!map || !group || !L) return
      group.clearLayers()
      for (const r of routes) {
        if (!r?.points?.length) continue
          const latlngs = r.points.map((p) => [p.lat, p.lon]) as [number, number][]
          L.polyline(latlngs).addTo(group)
      }
      // Größe nach UI-Änderungen korrigieren
      setTimeout(() => map.invalidateSize(), 0)
  }, [routes])

  return <div ref={hostRef} className={`w-full h-full ${className ?? ""}`} />
}
