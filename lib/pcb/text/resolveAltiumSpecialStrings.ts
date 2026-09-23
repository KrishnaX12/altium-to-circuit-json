import {
  type AltiumPcbDocument,
  type AltiumTextRecord,
  getPcbLayerStack,
  normalizeAltiumPcbLayerName,
} from "altiumts"

const LAYER_DISPLAY_NAMES: Record<string, string> = {
  TOP: "Top Layer",
  TOPLAYER: "Top Layer",
  BOTTOM: "Bottom Layer",
  BOTTOMLAYER: "Bottom Layer",
  TOPOVERLAY: "Top Overlay",
  BOTTOMOVERLAY: "Bottom Overlay",
}

export function resolveAltiumSpecialStrings({
  document,
  record,
  sourceText,
}: {
  document: AltiumPcbDocument
  record: AltiumTextRecord
  sourceText: string
}): string {
  if (!record.layer) return sourceText
  const normalizedLayer = normalizeAltiumPcbLayerName(record.layer)
  const layerEntry = document.board
    ? getPcbLayerStack(document.board).entries.find(
        (entry) =>
          (entry.name !== undefined &&
            normalizeAltiumPcbLayerName(entry.name) === normalizedLayer) ||
          (entry.layerId !== undefined &&
            normalizeAltiumPcbLayerName(entry.layerId) === normalizedLayer),
      )
    : undefined

  const displayName = layerEntry?.name ?? LAYER_DISPLAY_NAMES[normalizedLayer]
  return sourceText.replace(
    /'?(\.[A-Za-z][A-Za-z0-9_]*)'?/gu,
    (matchedText, specialStringName: string) =>
      specialStringName.toUpperCase() === ".LAYER_NAME"
        ? (displayName ?? matchedText)
        : matchedText,
  )
}
