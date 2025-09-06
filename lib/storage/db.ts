import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type { Route, BackupFile } from "@/lib/types"

interface GPXDatabase extends DBSchema {
  routes: {
    key: string
    value: Route
    indexes: {
      "by-date": string
      "by-category": string
      "by-period": string
    }
  }
  metadata: {
    key: string
    value: {
      version: number
      lastBackup?: string
      totalRoutes: number
    }
  }
}

class GPXStorage {
  private db: IDBPDatabase<GPXDatabase> | null = null
  private readonly DB_NAME = "gpx-route-manager"
  private readonly DB_VERSION = 1

  async init(): Promise<void> {
    if (this.db) return

    this.db = await openDB<GPXDatabase>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create routes store
        if (!db.objectStoreNames.contains("routes")) {
          const routeStore = db.createObjectStore("routes", { keyPath: "id" })
          routeStore.createIndex("by-date", "date")
          routeStore.createIndex("by-category", "category")
          routeStore.createIndex("by-period", "period_key")
        }

        // Create metadata store
        if (!db.objectStoreNames.contains("metadata")) {
          const metaStore = db.createObjectStore("metadata", { keyPath: "key" })
          // Initialize metadata
          metaStore.add({
            key: "app-info",
            version: 1,
            totalRoutes: 0,
          })
        }
      },
    })
  }

  async addRoute(route: Route): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const tx = this.db.transaction(["routes", "metadata"], "readwrite")
    await tx.objectStore("routes").add(route)

    // Update metadata
    const metadata = await tx.objectStore("metadata").get("app-info")
    if (metadata) {
      metadata.totalRoutes += 1
      await tx.objectStore("metadata").put(metadata)
    }

    await tx.done
  }

  async addRoutes(routes: Route[]): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const tx = this.db.transaction(["routes", "metadata"], "readwrite")
    const routeStore = tx.objectStore("routes")
    const metaStore = tx.objectStore("metadata")

    for (const route of routes) {
      await routeStore.add(route)
    }

    // Update metadata
    const metadata = await metaStore.get("app-info")
    if (metadata) {
      metadata.totalRoutes += routes.length
      await metaStore.put(metadata)
    }

    await tx.done
  }

  async getRoute(id: string): Promise<Route | undefined> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")
    return await this.db.get("routes", id)
  }

  async getAllRoutes(): Promise<Route[]> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")
    return await this.db.getAll("routes")
  }

  async getRoutesByPeriod(period: string): Promise<Route[]> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")
    return await this.db.getAllFromIndex("routes", "by-period", period)
  }

  async deleteRoute(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const tx = this.db.transaction(["routes", "metadata"], "readwrite")
    await tx.objectStore("routes").delete(id)

    // Update metadata
    const metadata = await tx.objectStore("metadata").get("app-info")
    if (metadata && metadata.totalRoutes > 0) {
      metadata.totalRoutes -= 1
      await tx.objectStore("metadata").put(metadata)
    }

    await tx.done
  }

  async exportBackup(): Promise<BackupFile> {
    const routes = await this.getAllRoutes()
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      routes,
    }
  }

  async importBackup(backup: BackupFile): Promise<void> {
    if (backup.version !== 1) {
      throw new Error("Unsupported backup version")
    }
    await this.addRoutes(backup.routes)
  }

  async clearAll(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error("Database not initialized")

    const tx = this.db.transaction(["routes", "metadata"], "readwrite")
    await tx.objectStore("routes").clear()

    // Reset metadata
    await tx.objectStore("metadata").put({
      key: "app-info",
      version: 1,
      totalRoutes: 0,
    })

    await tx.done
  }
}

export const gpxStorage = new GPXStorage()
