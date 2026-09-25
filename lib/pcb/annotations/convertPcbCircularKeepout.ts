import type { AltiumArcRecord } from "altiumts"
import type { PCBKeepoutCircle } from "circuit-json"
import { milsToMillimeters, toMillimeterPoint } from "../geometry"
import type { PcbCopperLayerMap } from "../layers"

export function convertPcbCircularKeepout({
  layerMap,
  record,
  recordIndex,
}: {
  layerMap: PcbCopperLayerMap
  record: AltiumArcRecord
  recordIndex: number
}): PCBKeepoutCircle | undefined {
  const center = record.center
  const radiusMils = record.radiusMils
  const rawSweepDegrees = record.endAngle - record.startAngle
  const isFullCircle = rawSweepDegrees === 0 || Math.abs(rawSweepDegrees) >= 360
  if (!center || !radiusMils || !isFullCircle) return undefined

  return {
    type: "pcb_keepout",
    pcb_keepout_id: `pcb_keepout_altium_arc_${recordIndex}`,
    shape: "circle",
    center: toMillimeterPoint(center),
    radius: milsToMillimeters(radiusMils + (record.widthMils ?? 0) / 2),
    layers: layerMap.layers,
    description: "Altium circular keepout",
  }
}
