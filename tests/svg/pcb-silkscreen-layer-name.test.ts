import { expect, test } from "bun:test"
import { parseAltiumPcbDoc, serializeAltiumPcbToSvg } from "altiumts"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { stackAltiumAndCircuitJsonSvgs } from "../helpers/stack-svg-comparison"

test("resolves Top Overlay special strings", async () => {
  const document = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|LAYER_V8_1NAME=Top Overlay|LAYER_V8_1LAYERID=TOPOVERLAY|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=700mil|VY1=0mil|KIND2=0|VX2=700mil|VY2=300mil|KIND3=0|VX3=0mil|VY3=300mil",
      "|RECORD=Text|LAYER=TOPOVERLAY|X=350mil|Y=200mil|HEIGHT=40mil|JUSTIFICATION=5|TEXT=.Layer_Name",
      "|RECORD=Text|LAYER=TOPOVERLAY|X=350mil|Y=100mil|HEIGHT=40mil|JUSTIFICATION=5|TEXT=Layer: '.Layer_Name'",
    ].join("\n"),
  )
  const circuitJson = convertAltiumPcbDocToCircuitJson(document)
  const altiumSvg = serializeAltiumPcbToSvg(document, {
    height: 300,
    title: "Altium layer name",
    width: 700,
  })
  const circuitJsonSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    matchBoardAspectRatio: true,
  })
  const comparisonSvg = stackAltiumAndCircuitJsonSvgs({
    altiumSvg,
    circuitJsonSvg,
    label: ".Layer_Name resolution: Top Overlay",
  })

  await expect(comparisonSvg).toMatchSvgSnapshot(import.meta.path)
})
