import { AltiumFillRecord, AltiumPadRecord, type AltiumRecord } from "altiumts"
import type { PcbSolderPaste } from "circuit-json"
import { getAltiumPadGeometry } from "./get-altium-pad-geometry"

const MILS_TO_MILLIMETERS = 0.0254
const BOARD_GRAPHICS_COMPONENT_ID = "pcb_component_altium_board_graphics"

export function convertAltiumPcbBottomSolderPaste({
  record,
  recordIndex,
}: {
  record: AltiumRecord
  recordIndex: number
}): PcbSolderPaste | undefined {
  if (!isBottomPasteLayer(record.getDecoded("LAYER"))) return undefined

  if (record instanceof AltiumPadRecord) {
    return convertBottomPastePad({ record, recordIndex })
  }
  if (record instanceof AltiumFillRecord) {
    return convertBottomPasteFill({ record, recordIndex })
  }
  return undefined
}

export function isAltiumPcbBottomSolderPasteRecord(
  record: AltiumRecord,
): boolean {
  return (
    isBottomPasteLayer(record.getDecoded("LAYER")) &&
    (record instanceof AltiumPadRecord || record instanceof AltiumFillRecord)
  )
}

function convertBottomPastePad({
  record,
  recordIndex,
}: {
  record: AltiumPadRecord
  recordIndex: number
}): PcbSolderPaste | undefined {
  const position = record.position
  const geometry = getAltiumPadGeometry(record)
  if (!position || !geometry) return undefined

  const x = milsToMillimeters(position.x)
  const y = milsToMillimeters(position.y)
  const width = milsToMillimeters(geometry.widthMils)
  const height = milsToMillimeters(geometry.heightMils)
  if (width <= 0 || height <= 0) return undefined

  const base = {
    type: "pcb_solder_paste" as const,
    pcb_solder_paste_id: `pcb_solder_paste_altium_${recordIndex}`,
    pcb_component_id: pcbComponentIdForRecord(record),
    layer: "bottom" as const,
  }
  const shape = normalizeShape(geometry.shape)

  if (shape === "ROUNDRECT") {
    return createPillPaste({
      ...base,
      x,
      y,
      width,
      height,
      radius: milsToMillimeters(geometry.cornerRadiusMils ?? 0),
      ccwRotationDegrees: record.rotation,
    })
  }

  if (shape === "ROUND" || shape === "CIRCLE" || shape === "OVAL") {
    if (Math.abs(width - height) < 0.0001) {
      return { ...base, shape: "circle", x, y, radius: width / 2 }
    }
    return createPillPaste({
      ...base,
      x,
      y,
      width,
      height,
      radius: Math.min(width, height) / 2,
      ccwRotationDegrees: record.rotation,
    })
  }

  if (!shape.includes("RECT") && shape !== "SQUARE") return undefined
  return record.rotation === 0
    ? { ...base, shape: "rect", x, y, width, height }
    : {
        ...base,
        shape: "rotated_rect",
        x,
        y,
        width,
        height,
        ccw_rotation: record.rotation,
      }
}

function convertBottomPasteFill({
  record,
  recordIndex,
}: {
  record: AltiumFillRecord
  recordIndex: number
}): PcbSolderPaste | undefined {
  if (!record.bounds) return undefined
  const width = milsToMillimeters(record.bounds.maxX - record.bounds.minX)
  const height = milsToMillimeters(record.bounds.maxY - record.bounds.minY)
  if (width <= 0 || height <= 0) return undefined

  const base = {
    type: "pcb_solder_paste" as const,
    pcb_solder_paste_id: `pcb_solder_paste_altium_${recordIndex}`,
    pcb_component_id: pcbComponentIdForRecord(record),
    layer: "bottom" as const,
    x: milsToMillimeters((record.bounds.minX + record.bounds.maxX) / 2),
    y: milsToMillimeters((record.bounds.minY + record.bounds.maxY) / 2),
    width,
    height,
  }
  return record.rotation === 0
    ? { ...base, shape: "rect" }
    : { ...base, shape: "rotated_rect", ccw_rotation: record.rotation }
}

function createPillPaste({
  ccwRotationDegrees,
  ...paste
}: Omit<
  Extract<PcbSolderPaste, { shape: "rotated_pill" }>,
  "shape" | "ccw_rotation"
> & {
  ccwRotationDegrees: number
}): PcbSolderPaste {
  return ccwRotationDegrees === 0
    ? { ...paste, shape: "pill" }
    : {
        ...paste,
        shape: "rotated_pill",
        ccw_rotation: ccwRotationDegrees,
      }
}

function isBottomPasteLayer(layer: string | undefined): boolean {
  return (layer ?? "").replace(/[\s_.-]+/gu, "").toUpperCase() === "BOTTOMPASTE"
}

function pcbComponentIdForRecord(record: AltiumRecord): string {
  const componentIndex = record.getNumber("COMPONENT")
  return componentIndex === undefined || componentIndex < 0
    ? BOARD_GRAPHICS_COMPONENT_ID
    : `pcb_component_altium_${componentIndex}`
}

function normalizeShape(shape: string | undefined): string {
  return (shape ?? "ROUND").replace(/[\s_-]+/gu, "").toUpperCase()
}

function milsToMillimeters(mils: number): number {
  return mils * MILS_TO_MILLIMETERS
}
