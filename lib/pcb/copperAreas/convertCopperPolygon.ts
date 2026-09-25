import { type AltiumPolygonRecord, getPcbContour } from "altiumts"
import type { PcbCopperPour } from "circuit-json"
import type { PcbCopperLayerMap } from "../layers"
import { contourToPoints } from "./contourToPoints"

export function convertCopperPolygon({
  polygonIndex,
  layerMap,
  record,
  sourceNetId,
}: {
  polygonIndex: number
  layerMap: PcbCopperLayerMap
  record: AltiumPolygonRecord
  sourceNetId: string | undefined
}): PcbCopperPour[] {
  const layer = layerMap.getLayer(record.layer)
  if (!layer) return []
  const points = contourToPoints(getPcbContour(record))
  if (points.length < 3) return []

  return [
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: `pcb_copper_pour_altium_polygon_${polygonIndex}`,
      ...(sourceNetId ? { source_net_id: sourceNetId } : {}),
      covered_with_solder_mask: true,
      layer,
      shape: "polygon",
      points,
    },
  ]
}
