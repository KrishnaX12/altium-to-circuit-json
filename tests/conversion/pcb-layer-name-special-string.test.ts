import { expect, test } from "bun:test"
import { parseAltiumPcbDoc } from "altiumts"
import type { PcbSilkscreenText } from "circuit-json"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"

test("resolves the layer name special string on PCB overlays", () => {
  const document = parseAltiumPcbDoc(
    [
      "|RECORD=Board|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=500mil|KIND3=0|VX3=0mil|VY3=500mil",
      "|RECORD=Text|LAYER=TOPOVERLAY|X=100mil|Y=100mil|HEIGHT=20mil|TEXT=.Layer_Name",
      "|RECORD=Text|LAYER=BOTTOMOVERLAY|X=100mil|Y=150mil|HEIGHT=20mil|TEXT=.Layer_Name",
      "|RECORD=Text|LAYER=TOPOVERLAY|X=100mil|Y=200mil|HEIGHT=20mil|TEXT=Assembly note",
    ].join("\n"),
  )
  const texts = convertAltiumPcbDocToCircuitJson(document).filter(
    (element): element is PcbSilkscreenText =>
      element.type === "pcb_silkscreen_text",
  )

  expect(texts.map((text) => text.text)).toEqual([
    "Top Overlay",
    "Bottom Overlay",
    "Assembly note",
  ])
})
