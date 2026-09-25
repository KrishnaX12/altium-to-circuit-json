import { normalizeLayer } from "./normalizeLayer"

export function getCopperLayerIdentity(
  layer: string | undefined,
): string | undefined {
  const normalized = normalizeLayer(layer)
  if (normalized === "TOP" || normalized === "TOPLAYER") return "TOP"
  if (normalized === "BOTTOM" || normalized === "BOTTOMLAYER") return "BOTTOM"
  const signal = /^(?:MID|MIDLAYER)(\d+)$/u.exec(normalized)
  if (signal) {
    const ordinal = Number(signal[1])
    if (ordinal >= 1 && ordinal <= 30) return `MID${ordinal}`
    throw new Error(`Unsupported Altium copper layer ${JSON.stringify(layer)}`)
  }
  const plane = /^(?:PLANE|INTERNALPLANE)(\d+)$/u.exec(normalized)
  if (plane) {
    const ordinal = Number(plane[1])
    if (ordinal >= 1 && ordinal <= 16) return `PLANE${ordinal}`
    throw new Error(`Unsupported Altium copper layer ${JSON.stringify(layer)}`)
  }
  if (!/^\d+$/u.test(layer?.trim() ?? "")) return undefined

  const id = Number(layer)
  if (id === 1 || id === 0x1000001) return "TOP"
  if (id === 32 || id === 0x100ffff) return "BOTTOM"
  if (id >= 2 && id <= 31) return `MID${id - 1}`
  if (id >= 39 && id <= 54) return `PLANE${id - 38}`
  const family = Math.floor(id / 0x10000)
  const ordinal = id % 0x10000
  if (family === 0x100 && ordinal >= 2 && ordinal <= 31) {
    return `MID${ordinal - 1}`
  }
  if (family === 0x101 && ordinal >= 1 && ordinal <= 16) {
    return `PLANE${ordinal}`
  }
  if (family === 0x100 || family === 0x101) {
    throw new Error(
      `Unsupported Altium copper layer ID ${JSON.stringify(layer)}`,
    )
  }
  return undefined
}
