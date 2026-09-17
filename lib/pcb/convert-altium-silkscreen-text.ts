import {
  type AltiumPcbDocument,
  type AltiumTextRecord,
  getPcbLayerStack,
  normalizeAltiumPcbLayerName,
} from "altiumts"
import type { PcbSilkscreenText } from "circuit-json"

const MILS_TO_MILLIMETERS = 0.0254
const SPECIAL_STRING_PATTERN =
  /'(\.[A-Za-z][A-Za-z0-9_]*)'|(\.[A-Za-z][A-Za-z0-9_]*)/gu

const TEXT_ANCHORS = [
  undefined,
  "top_left",
  "center_left",
  "bottom_left",
  "top_center",
  "center",
  "bottom_center",
  "top_right",
  "center_right",
  "bottom_right",
] as const

export function convertAltiumSilkscreenText({
  document,
  pcbComponentId,
  record,
  recordIndex,
}: {
  document: AltiumPcbDocument
  pcbComponentId: string
  record: AltiumTextRecord
  recordIndex: number
}): PcbSilkscreenText | undefined {
  if (!record.position || !isTextVisible(document, record)) return undefined

  const sourceText =
    decodeAltiumWideString(record.getDecoded("WIDESTRING")) ||
    record.getDecoded("TEXT") ||
    record.text
  if (!sourceText) return undefined

  const text = resolveSpecialStrings({ document, record, sourceText })
  if (!text) return undefined

  return {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: `pcb_silkscreen_text_altium_${recordIndex}`,
    pcb_component_id: pcbComponentId,
    text,
    font: "tscircuit2024",
    font_size: (record.heightMils ?? 30) * MILS_TO_MILLIMETERS,
    anchor_position: {
      x: record.position.x * MILS_TO_MILLIMETERS,
      y: record.position.y * MILS_TO_MILLIMETERS,
    },
    anchor_alignment: getTextAnchor(record.justification),
    ccw_rotation: record.rotation,
    layer:
      normalizeAltiumPcbLayerName(record.layer ?? "") === "BOTTOMOVERLAY"
        ? "bottom"
        : "top",
    is_mirrored: record.mirrored,
  }
}

function isTextVisible(
  document: AltiumPcbDocument,
  record: AltiumTextRecord,
): boolean {
  const component = document.getComponentForRecord(record)
  if (!component) return true
  if (record.isDesignator) return component.getBoolean("NAMEON") !== false
  if (record.isComment) return component.getBoolean("COMMENTON") !== false
  return true
}

function resolveSpecialStrings({
  document,
  record,
  sourceText,
}: {
  document: AltiumPcbDocument
  record: AltiumTextRecord
  sourceText: string
}): string | undefined {
  if (!sourceText.startsWith(".") && !sourceText.startsWith("'.")) {
    return sourceText
  }

  const layerName = getLayerName(document, record.layer)
  let foundSpecialString = false
  let hasUnresolvedSpecialString = false
  const resolvedText = sourceText.replace(
    SPECIAL_STRING_PATTERN,
    (_, quotedSpecialString: string, bareSpecialString: string) => {
      foundSpecialString = true
      const specialString = quotedSpecialString || bareSpecialString
      if (specialString.toUpperCase() === ".LAYER_NAME" && layerName) {
        return layerName
      }
      hasUnresolvedSpecialString = true
      return specialString
    },
  )

  return foundSpecialString && !hasUnresolvedSpecialString
    ? resolvedText
    : undefined
}

function getLayerName(
  document: AltiumPcbDocument,
  sourceLayer: string | undefined,
): string | undefined {
  if (!sourceLayer || !document.board) return undefined
  const normalizedSourceLayer = normalizeAltiumPcbLayerName(sourceLayer)
  return getPcbLayerStack(document.board).entries.find(
    (entry) =>
      entry.name &&
      normalizeAltiumPcbLayerName(entry.name) === normalizedSourceLayer,
  )?.name
}

function decodeAltiumWideString(raw: string | undefined): string {
  if (!raw) return ""
  if (!/^\d+(?:,\d+)*$/u.test(raw)) return raw
  try {
    return String.fromCodePoint(...raw.split(",").map(Number))
  } catch {
    return raw
  }
}

function getTextAnchor(
  justification: string | undefined,
): NonNullable<PcbSilkscreenText["anchor_alignment"]> {
  const justificationIndex = Number.parseInt(justification ?? "", 10)
  return TEXT_ANCHORS[justificationIndex] ?? "bottom_left"
}
