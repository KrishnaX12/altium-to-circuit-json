import type { AltiumPcbLayerStackEntry } from "altiumts"
import { getCopperLayerIdentity } from "./getCopperLayerIdentity"
import { normalizeLayer } from "./normalizeLayer"

export function getCopperStackEntryKeys(
  entry: AltiumPcbLayerStackEntry,
): string[] {
  const identity = getCopperLayerIdentity(
    entry.layerId ??
      (entry.source === "legacy" ? String(entry.index) : undefined),
  )
  const nameIdentity = getCopperLayerIdentity(entry.name)
  if (identity && nameIdentity && identity !== nameIdentity) {
    throw new Error(
      `Ambiguous copper layer name ${JSON.stringify(entry.name)} for ${identity} in board stack`,
    )
  }
  return [
    entry.layerId,
    entry.name,
    entry.source === "legacy" ? String(entry.index) : undefined,
  ].flatMap((layer) =>
    layer ? [getCopperLayerIdentity(layer) ?? normalizeLayer(layer)] : [],
  )
}
