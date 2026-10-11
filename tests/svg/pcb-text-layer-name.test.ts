import { expect, test } from "bun:test"
import { parseAltiumPcbDoc, serializeAltiumPcbToSvg } from "altiumts"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { stackAltiumAndCircuitJsonSvgs } from "../helpers/stack-svg-comparison"

test("resolves overlay and copper layer names", async () => {
  const document = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=700mil|VY1=0mil|KIND2=0|VX2=700mil|VY2=500mil|KIND3=0|VX3=0mil|VY3=500mil",
      ...["TOPOVERLAY", "BOTTOMOVERLAY", "TOP", "BOTTOM"].map(
        (layer, index) =>
          `|RECORD=Text|LAYER=${layer}|X=350mil|Y=${400 - index * 100}mil|HEIGHT=40mil|JUSTIFICATION=5|TEXT=.Layer_Name`,
      ),
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
    label: ".Layer_Name resolution: top/bottom overlay and copper",
  })

  await expect(comparisonSvg).toMatchSvgSnapshot(import.meta.path)
})
