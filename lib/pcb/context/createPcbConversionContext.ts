import type { AltiumPcbDocument } from "altiumts"
import { PcbCopperLayerMap } from "../layers"
import type { ConvertAltiumPcbDocOptions, PcbConversionContext } from "../model"
import { createPcbNetContext } from "./createPcbNetContext"

export function createPcbConversionContext({
  document,
  options,
}: {
  document: AltiumPcbDocument
  options: ConvertAltiumPcbDocOptions
}): PcbConversionContext {
  return {
    document,
    elements: [],
    layerMap: new PcbCopperLayerMap(document),
    netContext: createPcbNetContext(document),
    options,
  }
}
