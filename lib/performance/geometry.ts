export interface Point {
  x: number
  y: number
  z?: number
}

export interface SimplificationOptions {
  tolerance: number
  highQuality?: boolean
}

/**
 * Douglas-Peucker line simplification algorithm
 * Reduces the number of points in a line while preserving its shape
 */
export function simplifyLine(points: Point[], tolerance = 1, highQuality = false): Point[] {
  if (points.length <= 2) return points

  const sqTolerance = tolerance * tolerance

  if (!highQuality) {
    points = simplifyRadialDistance(points, sqTolerance)
  }

  points = simplifyDouglasPeucker(points, sqTolerance)

  return points
}

/**
 * Basic distance-based point reduction
 */
function simplifyRadialDistance(points: Point[], sqTolerance: number): Point[] {
  let prevPoint = points[0]
  const newPoints = [prevPoint]

  for (let i = 1; i < points.length; i++) {
    const point = points[i]

    if (getSquareDistance(point, prevPoint) > sqTolerance) {
      newPoints.push(point)
      prevPoint = point
    }
  }

  if (prevPoint !== points[points.length - 1]) {
    newPoints.push(points[points.length - 1])
  }

  return newPoints
}

/**
 * Douglas-Peucker simplification algorithm
 */
function simplifyDouglasPeucker(points: Point[], sqTolerance: number): Point[] {
  const len = points.length
  const markers = new Array(len)

  let first = 0
  let last = len - 1
  const stack = []
  const newPoints = []

  markers[first] = markers[last] = 1

  while (last) {
    let maxSqDist = 0
    let index = 0

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSquareSegmentDistance(points[i], points[first], points[last])

      if (sqDist > maxSqDist) {
        index = i
        maxSqDist = sqDist
      }
    }

    if (maxSqDist > sqTolerance) {
      markers[index] = 1
      stack.push(first, index, index, last)
    }

    if (stack.length) {
      last = stack.pop()!
      first = stack.pop()!
    } else {
      last = 0
    }
  }

  for (let i = 0; i < len; i++) {
    if (markers[i]) {
      newPoints.push(points[i])
    }
  }

  return newPoints
}

/**
 * Square distance between two points
 */
function getSquareDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return dx * dx + dy * dy
}

/**
 * Square distance from a point to a line segment
 */
function getSquareSegmentDistance(p: Point, p1: Point, p2: Point): number {
  let x = p1.x
  let y = p1.y
  let dx = p2.x - x
  let dy = p2.y - y

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)

    if (t > 1) {
      x = p2.x
      y = p2.y
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }

  dx = p.x - x
  dy = p.y - y

  return dx * dx + dy * dy
}

/**
 * Calculate appropriate tolerance based on zoom level
 */
export function getToleranceForZoom(zoom: number): number {
  // Higher zoom = lower tolerance (more detail)
  // Lower zoom = higher tolerance (less detail)
  const baseToleranceMeters = 10 // Base tolerance in meters
  const zoomFactor = Math.pow(2, 18 - zoom) // Inverse relationship with zoom
  return baseToleranceMeters * zoomFactor * 0.00001 // Convert to degrees approximately
}

/**
 * Convert GeoJSON coordinates to simplified format
 */
export function simplifyGeoJSONCoordinates(
  coordinates: number[][],
  tolerance: number,
  highQuality = false,
): number[][] {
  const points: Point[] = coordinates.map(([lon, lat, ele]) => ({
    x: lon,
    y: lat,
    z: ele,
  }))

  const simplified = simplifyLine(points, tolerance, highQuality)

  return simplified.map((point) => {
    const coord = [point.x, point.y]
    if (point.z !== undefined) coord.push(point.z)
    return coord
  })
}

/**
 * Check if a bounding box intersects with viewport bounds
 */
export function intersectsBounds(
  routeBounds: [number, number, number, number], // [minLon, minLat, maxLon, maxLat]
  viewBounds: [number, number, number, number],
): boolean {
  const [routeMinLon, routeMinLat, routeMaxLon, routeMaxLat] = routeBounds
  const [viewMinLon, viewMinLat, viewMaxLon, viewMaxLat] = viewBounds

  return !(routeMaxLon < viewMinLon || routeMinLon > viewMaxLon || routeMaxLat < viewMinLat || routeMinLat > viewMaxLat)
}

/**
 * Calculate bounding box for a set of coordinates
 */
export function calculateBounds(coordinates: number[][]): [number, number, number, number] {
  if (coordinates.length === 0) return [0, 0, 0, 0]

  let minLon = coordinates[0][0]
  let minLat = coordinates[0][1]
  let maxLon = coordinates[0][0]
  let maxLat = coordinates[0][1]

  for (const [lon, lat] of coordinates) {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }

  return [minLon, minLat, maxLon, maxLat]
}
