import { type AltiumArcRecord, approximateAltiumArc } from "altiumts"
import type { PcbTrace } from "circuit-json"
import { milsToMillimeters, toMillimeterPoint } from "../geometry"
import type { PcbCopperLayerMap } from "../layers"
import type { PcbNetContext } from "../model"

export function convertPcbArcTrack({
  layerMap,
  record,
  recordIndex,
  netContext,
}: {
  layerMap: PcbCopperLayerMap
  record: AltiumArcRecord
  recordIndex: number
  netContext: PcbNetContext
}): PcbTrace | undefined {
  if (!record.center || !record.radiusMils) return undefined
  const layer = layerMap.getLayer(record.layer)
  if (!layer) return undefined
  const width = milsToMillimeters(record.widthMils ?? 4)
  const points = approximateAltiumArc({
    center: record.center,
    radius: record.radiusMils,
    startAngleDegrees: record.startAngle,
    endAngleDegrees: record.endAngle,
  })
  const sourceTraceId = netContext.getSourceTraceId(record)

  return {
    type: "pcb_trace",
    pcb_trace_id: `pcb_trace_altium_arc_${recordIndex}`,
    ...(sourceTraceId ? { source_trace_id: sourceTraceId } : {}),
    should_round_corners: true,
    route: points.map((point) => ({
      route_type: "wire",
      ...toMillimeterPoint(point),
      width,
      layer,
    })),
  }
}
