import {
  AltiumFillRecord,
  type AltiumPcbDocument,
  AltiumPolygonRecord,
  type AltiumRecord,
  AltiumRegionRecord,
  getPcbContour,
  getPcbRecordPolygonIndex,
  getPcbRegionGeometry,
} from "altiumts"
import type { PcbCopperPour } from "circuit-json"
import { PcbCopperLayerMap } from "../layers"
import { convertCopperFill } from "./convertCopperFill"
import { convertCopperPolygon } from "./convertCopperPolygon"
import { convertCopperRegion } from "./convertCopperRegion"
import { isContourInsideContour } from "./isContourInsideContour"

export function convertAltiumCopperAreas(
  document: AltiumPcbDocument,
  {
    layerMap = new PcbCopperLayerMap(document),
    getSourceNetId = () => undefined,
  }: {
    layerMap?: PcbCopperLayerMap
    getSourceNetId?: (record: AltiumRecord) => string | undefined
  } = {},
): PcbCopperPour[] {
  const polygonsWithCopperRegions = new Set<AltiumPolygonRecord>()
  const cutoutsByPolygon = new Map<AltiumPolygonRecord, AltiumRegionRecord[]>()
  const polygonContours = new Map<
    AltiumPolygonRecord,
    ReturnType<typeof getPcbContour>
  >()
  for (const record of document.records) {
    if (
      !(record instanceof AltiumRegionRecord) ||
      record.recordKind !== "Region"
    ) {
      continue
    }
    const polygonIndex = getPcbRecordPolygonIndex(document, record)
    if (record.regionKind === "COPPER") {
      const polygon =
        polygonIndex === undefined ? undefined : document.polygons[polygonIndex]
      if (polygon) polygonsWithCopperRegions.add(polygon)
    } else if (record.regionKind === "POLYGON_CUTOUT") {
      const cutoutGeometry = getPcbRegionGeometry(record)
      if (polygonIndex === undefined && cutoutGeometry.holes.length > 0) {
        continue
      }
      const candidatePolygons =
        polygonIndex === undefined
          ? document.polygons
          : [document.polygons[polygonIndex]].filter(
              (polygon): polygon is AltiumPolygonRecord =>
                polygon !== undefined,
            )
      const polygons = candidatePolygons.filter((polygon) => {
        if (record.layer !== polygon.layer && record.layer !== "MULTILAYER") {
          return false
        }
        let polygonContour = polygonContours.get(polygon)
        if (!polygonContour) {
          polygonContour = getPcbContour(polygon)
          polygonContours.set(polygon, polygonContour)
        }
        return isContourInsideContour({
          innerContour: cutoutGeometry.outline,
          outerContour: polygonContour,
        })
      })
      for (const polygon of polygons) {
        const cutouts = cutoutsByPolygon.get(polygon) ?? []
        cutouts.push(record)
        cutoutsByPolygon.set(polygon, cutouts)
      }
    }
  }
  const polygonIndexes = new Map(
    document.polygons.map((polygon, index) => [polygon, index]),
  )

  return document.records.flatMap((record, recordIndex) => {
    if (record instanceof AltiumRegionRecord) {
      return convertCopperRegion({
        layerMap,
        record,
        recordIndex,
        sourceNetId: getSourceNetId(record),
      })
    }
    if (record instanceof AltiumPolygonRecord) {
      const polygonIndex = polygonIndexes.get(record)
      if (
        record.shelved === true ||
        polygonIndex === undefined ||
        polygonsWithCopperRegions.has(record)
      ) {
        return []
      }
      return convertCopperPolygon({
        cutouts: cutoutsByPolygon.get(record) ?? [],
        layerMap,
        polygonIndex,
        record,
        sourceNetId: getSourceNetId(record),
      })
    }
    if (record instanceof AltiumFillRecord) {
      return convertCopperFill({
        layerMap,
        record,
        recordIndex,
        sourceNetId: getSourceNetId(record),
      })
    }
    return []
  })
}
