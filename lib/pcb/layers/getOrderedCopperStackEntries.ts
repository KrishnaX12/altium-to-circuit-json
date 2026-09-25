import {
  type AltiumPcbDocument,
  type AltiumPcbLayerStackEntry,
  getPcbLayerStack,
} from "altiumts"
import { getCopperLayerIdentity } from "./getCopperLayerIdentity"
import { getCopperStackEntryKeys } from "./getCopperStackEntryKeys"

export function getOrderedCopperStackEntries(
  document: AltiumPcbDocument,
): AltiumPcbLayerStackEntry[] {
  if (!document.board) return []
  const entries = getPcbLayerStack(document.board).entries
  for (const source of ["v8", "v7", "legacy"] as const) {
    const copper = entries.filter((entry) => {
      if (entry.source !== source) return false
      const identity =
        entry.layerId ??
        (source === "legacy" ? String(entry.index) : entry.name)
      return (
        Boolean(getCopperLayerIdentity(identity)) ||
        (entry.layerId === undefined &&
          source !== "legacy" &&
          entry.copperThickness !== undefined)
      )
    })
    if (copper.length === 0) continue
    if (source === "v8") return copper

    const top = copper.find((entry) =>
      getCopperStackEntryKeys(entry).includes("TOP"),
    )
    const bottom = copper.find((entry) =>
      getCopperStackEntryKeys(entry).includes("BOTTOM"),
    )
    if (!top || !bottom)
      throw new Error("Copper board stack is missing its outer layers")
    if (copper.length === 2 && top.next === undefined) return [top, bottom]
    const ordered: AltiumPcbLayerStackEntry[] = []
    let current: AltiumPcbLayerStackEntry | undefined = top
    while (current) {
      if (ordered.includes(current))
        throw new Error("Cycle in copper board stack")
      ordered.push(current)
      if (current === bottom) return ordered
      const nextIdentity = getCopperLayerIdentity(current.next)
      const next = copper.filter(
        (entry) =>
          nextIdentity !== undefined &&
          getCopperStackEntryKeys(entry).includes(nextIdentity),
      )
      if (next.length !== 1)
        throw new Error("Cannot resolve copper board stack NEXT link")
      current = next[0]
    }
  }
  return []
}
