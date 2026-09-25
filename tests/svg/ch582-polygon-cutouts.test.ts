import { expect, test } from "bun:test"
import {
  AltiumRegionRecord,
  getPcbBoardGeometry,
  getPcbRecordPolygonIndex,
  parseAltiumPcbDoc,
  serializeAltiumPcbLayerToSvg,
} from "altiumts"
import type { PcbCopperPour } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { milsToMillimeters } from "../../lib/pcb/geometry"
import { readReferenceText } from "../helpers/read-reference"
import { stackAltiumAndCircuitJsonSvgs } from "../helpers/stack-svg-comparison"

test("CH582 PCB polygon cutouts", async () => {
  const document = parseAltiumPcbDoc(await readReferenceText("ch582.PcbDoc"))
  const bottomCutouts = document.records.filter(
    (region) =>
      region instanceof AltiumRegionRecord &&
      region.regionKind === "POLYGON_CUTOUT" &&
      region.layer === "BOTTOM",
  )
  expect(bottomCutouts).toHaveLength(2)
  expect(
    bottomCutouts.every(
      (cutout) => getPcbRecordPolygonIndex(document, cutout) === undefined,
    ),
  ).toBe(true)

  const circuitJson = convertAltiumPcbDocToCircuitJson(document)
  const bottomPolygon = circuitJson
    .filter(
      (element): element is PcbCopperPour => element.type === "pcb_copper_pour",
    )
    .find(
      (pour) => pour.pcb_copper_pour_id === "pcb_copper_pour_altium_polygon_0",
    )
  expect(bottomPolygon?.shape).toBe("polygon")

  const boardBounds = getPcbBoardGeometry(document).outline.bounds
  if (!boardBounds) throw new Error("CH582 board outline has no bounds")
  const padding =
    Math.max(
      boardBounds.maxX - boardBounds.minX,
      boardBounds.maxY - boardBounds.minY,
    ) * 0.05
  const viewBox = {
    x: boardBounds.minX - padding,
    y: boardBounds.minY - padding,
    width: boardBounds.maxX - boardBounds.minX + 2 * padding,
    height: boardBounds.maxY - boardBounds.minY + 2 * padding,
  }
  const altiumSvg = serializeAltiumPcbLayerToSvg(document, "BOTTOM", {
    height: 600,
    showText: false,
    viewBox,
    width: 800,
  })
  const circuitJsonSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    height: 600,
    layer: "bottom",
    viewport: {
      minX: milsToMillimeters(viewBox.x),
      minY: milsToMillimeters(viewBox.y),
      maxX: milsToMillimeters(viewBox.x + viewBox.width),
      maxY: milsToMillimeters(viewBox.y + viewBox.height),
    },
    width: 800,
  })
  const comparisonSvg = stackAltiumAndCircuitJsonSvgs({
    altiumSvg,
    circuitJsonSvg,
    label: "CH582 PCB bottom polygon cutouts",
  })

  await expect(comparisonSvg).toMatchSvgSnapshot(import.meta.path)
})
