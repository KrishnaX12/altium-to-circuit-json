import type { AltiumPcbContour } from "altiumts"

export function isContourInsideContour({
  innerContour,
  outerContour,
}: {
  innerContour: AltiumPcbContour
  outerContour: AltiumPcbContour
}): boolean {
  const innerBounds = innerContour.bounds
  const outerBounds = outerContour.bounds
  if (
    !innerBounds ||
    !outerBounds ||
    innerBounds.minX <= outerBounds.minX ||
    innerBounds.maxX >= outerBounds.maxX ||
    innerBounds.minY <= outerBounds.minY ||
    innerBounds.maxY >= outerBounds.maxY
  ) {
    return false
  }

  const innerPoints = innerContour.isExplicitlyClosed
    ? innerContour.points.slice(0, -1)
    : innerContour.points
  const outerPoints = outerContour.isExplicitlyClosed
    ? outerContour.points.slice(0, -1)
    : outerContour.points
  if (innerPoints.length < 3 || outerPoints.length < 3) return false

  for (const point of innerPoints) {
    let isInside = false
    for (let index = 0; index < outerPoints.length; index++) {
      const start = outerPoints[index]
      const end = outerPoints[(index + 1) % outerPoints.length]
      if (!start || !end) continue
      const cross =
        (end.x - start.x) * (point.y - start.y) -
        (end.y - start.y) * (point.x - start.x)
      if (
        cross === 0 &&
        point.x >= Math.min(start.x, end.x) &&
        point.x <= Math.max(start.x, end.x) &&
        point.y >= Math.min(start.y, end.y) &&
        point.y <= Math.max(start.y, end.y)
      ) {
        return false
      }
      if (
        start.y > point.y !== end.y > point.y &&
        point.x <
          start.x +
            ((point.y - start.y) * (end.x - start.x)) / (end.y - start.y)
      ) {
        isInside = !isInside
      }
    }
    if (!isInside) return false
  }

  for (let innerIndex = 0; innerIndex < innerPoints.length; innerIndex++) {
    const innerStart = innerPoints[innerIndex]
    const innerEnd = innerPoints[(innerIndex + 1) % innerPoints.length]
    if (!innerStart || !innerEnd) continue
    for (let outerIndex = 0; outerIndex < outerPoints.length; outerIndex++) {
      const outerStart = outerPoints[outerIndex]
      const outerEnd = outerPoints[(outerIndex + 1) % outerPoints.length]
      if (!outerStart || !outerEnd) continue
      const innerStartSide =
        (outerEnd.x - outerStart.x) * (innerStart.y - outerStart.y) -
        (outerEnd.y - outerStart.y) * (innerStart.x - outerStart.x)
      const innerEndSide =
        (outerEnd.x - outerStart.x) * (innerEnd.y - outerStart.y) -
        (outerEnd.y - outerStart.y) * (innerEnd.x - outerStart.x)
      const outerStartSide =
        (innerEnd.x - innerStart.x) * (outerStart.y - innerStart.y) -
        (innerEnd.y - innerStart.y) * (outerStart.x - innerStart.x)
      const outerEndSide =
        (innerEnd.x - innerStart.x) * (outerEnd.y - innerStart.y) -
        (innerEnd.y - innerStart.y) * (outerEnd.x - innerStart.x)
      if (
        (innerStartSide * innerEndSide < 0 &&
          outerStartSide * outerEndSide < 0) ||
        (outerStartSide === 0 &&
          outerStart.x >= Math.min(innerStart.x, innerEnd.x) &&
          outerStart.x <= Math.max(innerStart.x, innerEnd.x) &&
          outerStart.y >= Math.min(innerStart.y, innerEnd.y) &&
          outerStart.y <= Math.max(innerStart.y, innerEnd.y))
      ) {
        return false
      }
    }
  }
  return true
}
