import {
  type AltiumPcbDocument,
  type AltiumTextRecord,
  getPcbLayerStack,
  normalizeAltiumPcbLayerName,
} from "altiumts"

const OVERLAY_LAYER_DISPLAY_NAMES: Record<string, string> = {
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

  const displayName =
    layerEntry?.name ?? OVERLAY_LAYER_DISPLAY_NAMES[normalizedLayer]
  return sourceText.replace(
    /'?(\.[A-Za-z][A-Za-z0-9_]*)'?/gu,
    (matchedText, specialStringName: string) =>
      specialStringName.toUpperCase() === ".LAYER_NAME"
        ? (displayName ?? matchedText)
        : matchedText,
  )
}
