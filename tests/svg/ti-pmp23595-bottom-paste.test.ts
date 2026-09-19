import { expect, test } from "bun:test"
import { parseAltiumBinaryPcbDoc, serializeAltiumPcbLayerToSvg } from "altiumts"
import type { AnyCircuitElement, PcbSolderPaste } from "circuit-json"
import { convertCircuitJsonToSolderPasteMask } from "circuit-to-svg"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { TI_POWER_REFERENCE_PCB_FILENAMES } from "../../scripts/references/reference-manifest"
import { readReferenceBytes } from "../helpers/read-reference"
import { stackAltiumAndCircuitJsonSvgs } from "../helpers/stack-svg-comparison"

test(
  "TI PMP23595 bottom solder paste",
  async () => {
    const source = await readReferenceBytes(
      TI_POWER_REFERENCE_PCB_FILENAMES.pmp23595,
    )
    const document = parseAltiumBinaryPcbDoc(source)
    const circuitJson = convertAltiumPcbDocToCircuitJson(document)
    const bottomPaste = circuitJson.filter(isBottomSolderPaste)
    expect(bottomPaste.length).toBeGreaterThan(0)
    const apertureBounds = bottomPaste.map(getSolderPasteBounds)
    const millimetersPerMil = 0.0254
    const paddingMils = 40
    const minX = Math.min(...apertureBounds.map((bounds) => bounds.minX))
    const minY = Math.min(...apertureBounds.map((bounds) => bounds.minY))
    const maxX = Math.max(...apertureBounds.map((bounds) => bounds.maxX))
    const maxY = Math.max(...apertureBounds.map((bounds) => bounds.maxY))
    const board = circuitJson.find((element) => element.type === "pcb_board")
    if (!board) throw new Error("PMP23595 conversion did not produce a board")
    const paddingMillimeters = paddingMils * millimetersPerMil
    const cropBoard = {
      ...board,
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      width: maxX - minX + paddingMillimeters * 2,
      height: maxY - minY + paddingMillimeters * 2,
      outline: undefined,
    }
    const title = "TI PMP23595 bottom solder paste"
    const altiumSvg = serializeAltiumPcbLayerToSvg(document, "BOTTOMPASTE", {
      height: 800,
      showBoardOutline: false,
      title: `${title} — altiumts source`,
      viewBox: {
        x: minX / millimetersPerMil - paddingMils,
        y: minY / millimetersPerMil - paddingMils,
        width: (maxX - minX) / millimetersPerMil + paddingMils * 2,
        height: (maxY - minY) / millimetersPerMil + paddingMils * 2,
      },
      width: 800,
    })
    const circuitJsonSvg = convertCircuitJsonToSolderPasteMask(
      [cropBoard, ...bottomPaste],
      {
        height: 800,
        layer: "bottom",
        width: 800,
      },
    )
    const comparisonSvg = stackAltiumAndCircuitJsonSvgs({
      altiumSvg,
      circuitJsonSvg,
      label: title,
    })

    await expect(comparisonSvg).toMatchSvgSnapshot(import.meta.path)
  },
  { timeout: 600_000 },
)

function isBottomSolderPaste(
  element: AnyCircuitElement,
): element is PcbSolderPaste {
  return element.type === "pcb_solder_paste" && element.layer === "bottom"
}

function getSolderPasteBounds(element: PcbSolderPaste): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  if (element.shape === "circle") {
    return {
      minX: element.x - element.radius,
      minY: element.y - element.radius,
      maxX: element.x + element.radius,
      maxY: element.y + element.radius,
    }
  }

  const rotationDegrees =
    element.shape === "rotated_rect" || element.shape === "rotated_pill"
      ? element.ccw_rotation
      : 0
  const rotationRadians = (rotationDegrees * Math.PI) / 180
  const halfWidth = element.width / 2
  const halfHeight = element.height / 2
  const halfBoundsWidth =
    Math.abs(Math.cos(rotationRadians)) * halfWidth +
    Math.abs(Math.sin(rotationRadians)) * halfHeight
  const halfBoundsHeight =
    Math.abs(Math.sin(rotationRadians)) * halfWidth +
    Math.abs(Math.cos(rotationRadians)) * halfHeight
  return {
    minX: element.x - halfBoundsWidth,
    minY: element.y - halfBoundsHeight,
    maxX: element.x + halfBoundsWidth,
    maxY: element.y + halfBoundsHeight,
  }
}
