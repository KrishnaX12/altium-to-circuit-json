import {
  type AltiumPolygonRecord,
  type AltiumRegionRecord,
  getPcbContour,
  getPcbRegionGeometry,
} from "altiumts"
import type { PcbCopperPour } from "circuit-json"
import type { PcbCopperLayerMap } from "../layers"
import { contourToPoints } from "./contourToPoints"

export function convertCopperPolygon({
  cutouts,
  polygonIndex,
  layerMap,
  record,
  sourceNetId,
}: {
  cutouts: AltiumRegionRecord[]
  polygonIndex: number
  layerMap: PcbCopperLayerMap
  record: AltiumPolygonRecord
  sourceNetId: string | undefined
}): PcbCopperPour[] {
  const layer = layerMap.getLayer(record.layer)
  if (!layer) return []
  const points = contourToPoints(getPcbContour(record))
  if (points.length < 3) return []
  const innerRings = cutouts
    .map((cutout) => ({
      vertices: contourToPoints(getPcbRegionGeometry(cutout).outline),
    }))
    .filter((ring) => ring.vertices.length >= 3)

  return [
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: `pcb_copper_pour_altium_polygon_${polygonIndex}`,
      ...(sourceNetId ? { source_net_id: sourceNetId } : {}),
      covered_with_solder_mask: true,
      layer,
      ...(innerRings.length === 0
        ? { shape: "polygon" as const, points }
        : {
            shape: "brep" as const,
            brep_shape: {
              outer_ring: { vertices: points },
              inner_rings: innerRings,
            },
          }),
    },
  ]
}
