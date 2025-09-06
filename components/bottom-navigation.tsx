"use client"

import { Map, List, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavigationProps {
  activeView: "map" | "routes" | "import"
  onViewChange: (view: "map" | "routes" | "import") => void
}

export function BottomNavigation({ activeView, onViewChange }: BottomNavigationProps) {
  const navItems = [
    { id: "map" as const, label: "Karte", icon: Map },
    { id: "routes" as const, label: "Routen", icon: List },
    { id: "import" as const, label: "Import", icon: Upload },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
              "text-xs font-medium",
              activeView === id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
