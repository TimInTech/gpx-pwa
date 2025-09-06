export interface PerformanceMetrics {
  renderTime: number
  routeCount: number
  pointCount: number
  memoryUsage?: number
  fps?: number
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics = 100
  private frameCount = 0
  private lastFrameTime = 0
  private fpsHistory: number[] = []

  startRender(): number {
    return performance.now()
  }

  endRender(startTime: number, routeCount: number, pointCount: number): PerformanceMetrics {
    const renderTime = performance.now() - startTime
    const memoryUsage = this.getMemoryUsage()

    const metric: PerformanceMetrics = {
      renderTime,
      routeCount,
      pointCount,
      memoryUsage,
      fps: this.getCurrentFPS(),
    }

    this.addMetric(metric)
    return metric
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric)
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  private getMemoryUsage(): number | undefined {
    if ("memory" in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
    return undefined
  }

  private getCurrentFPS(): number {
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const fps = 1000 / (now - this.lastFrameTime)
      this.fpsHistory.push(fps)
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift()
      }
    }
    this.lastFrameTime = now
    this.frameCount++

    // Return average FPS over last 60 frames
    if (this.fpsHistory.length > 0) {
      return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
    }
    return 0
  }

  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0
    return this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length
  }

  getAverageFPS(): number {
    const fpsMetrics = this.metrics.filter((m) => m.fps !== undefined).map((m) => m.fps!)
    if (fpsMetrics.length === 0) return 0
    return fpsMetrics.reduce((sum, fps) => sum + fps, 0) / fpsMetrics.length
  }

  getCurrentMemoryUsage(): number | undefined {
    return this.getMemoryUsage()
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  shouldOptimize(): boolean {
    const latest = this.getLatestMetrics()
    if (!latest) return false

    // Optimize if render time > 16ms (60fps threshold) or FPS < 30
    return latest.renderTime > 16 || (latest.fps !== undefined && latest.fps < 30)
  }

  logPerformanceWarning(): void {
    const latest = this.getLatestMetrics()
    if (latest && this.shouldOptimize()) {
      console.warn("[Performance] Slow rendering detected:", {
        renderTime: `${latest.renderTime.toFixed(2)}ms`,
        fps: latest.fps ? `${latest.fps.toFixed(1)} FPS` : "N/A",
        routes: latest.routeCount,
        points: latest.pointCount,
        memory: latest.memoryUsage ? `${latest.memoryUsage.toFixed(1)}MB` : "N/A",
      })
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()
