import {
  type AltiumPcbDocument,
  type AltiumTextRecord,
  getPcbLayerStack,
  normalizeAltiumPcbLayerName,
} from "altiumts"

interface SpecialStringResolutionContext {
  document: AltiumPcbDocument
  record: AltiumTextRecord
}

type SpecialStringResolver = (
  resolutionContext: SpecialStringResolutionContext,
) => string | undefined

const SPECIAL_STRING_PATTERN = /'?(\.[A-Za-z][A-Za-z0-9_]*)'?/gu

const OVERLAY_LAYER_DISPLAY_NAMES: Record<string, string> = {
  TOPOVERLAY: "Top Overlay",
  BOTTOMOVERLAY: "Bottom Overlay",
}

const SPECIAL_STRING_RESOLVERS: Record<string, SpecialStringResolver> = {
  ".LAYER_NAME": resolvePcbLayerDisplayName,
}

export function resolveAltiumSpecialStrings({
  document,
  record,
  sourceText,
}: SpecialStringResolutionContext & { sourceText: string }): string {
  const matches = sourceText.matchAll(SPECIAL_STRING_PATTERN)
  let resolvedText = ""
  let sourceOffset = 0

  for (const match of matches) {
    const matchedText = match[0]
    const specialStringName = match[1]
    const matchOffset = match.index
    if (!specialStringName) continue

    const resolver = SPECIAL_STRING_RESOLVERS[specialStringName.toUpperCase()]
    const replacement = resolver?.({ document, record }) ?? matchedText
    resolvedText += sourceText.slice(sourceOffset, matchOffset) + replacement
    sourceOffset = matchOffset + matchedText.length
  }

  return resolvedText + sourceText.slice(sourceOffset)
}

function resolvePcbLayerDisplayName({
  document,
  record,
}: SpecialStringResolutionContext): string | undefined {
  if (!record.layer) return undefined
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

  return layerEntry?.name ?? OVERLAY_LAYER_DISPLAY_NAMES[normalizedLayer]
}
