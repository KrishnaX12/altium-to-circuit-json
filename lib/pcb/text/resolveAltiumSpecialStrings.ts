import {
  type AltiumPcbDocument,
  type AltiumTextRecord,
  getPcbLayerStack,
  normalizeAltiumPcbLayerName,
} from "altiumts"

export function resolveAltiumSpecialStrings({
  document,
  record,
}: {
  document: AltiumPcbDocument
  record: AltiumTextRecord
}): string {
  const sourceText = record.text ?? ""
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

  let defaultDisplayName: string | undefined
  switch (normalizedLayer) {
    case "TOP":
    case "TOPLAYER":
      defaultDisplayName = "Top Layer"
      break
    case "BOTTOM":
    case "BOTTOMLAYER":
      defaultDisplayName = "Bottom Layer"
      break
    case "TOPOVERLAY":
      defaultDisplayName = "Top Overlay"
      break
    case "BOTTOMOVERLAY":
      defaultDisplayName = "Bottom Overlay"
      break
  }

  const displayName = layerEntry?.name ?? defaultDisplayName
  return sourceText.replace(
    /'\.[A-Za-z][A-Za-z0-9_]*'|(?<![A-Za-z0-9_'])\.[A-Za-z][A-Za-z0-9_]*(?![A-Za-z0-9_'])/gu,
    (matchedText) => {
      const specialStringName = matchedText.startsWith("'")
        ? matchedText.slice(1, -1)
        : matchedText
      return specialStringName.toUpperCase() === ".LAYER_NAME"
        ? (displayName ?? matchedText)
        : matchedText
    },
  )
}
