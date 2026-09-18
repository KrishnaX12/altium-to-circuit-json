import {
  AltiumBinaryPcbDoc,
  AltiumPcbDoc,
  getPcbBoardGeometry,
  parseAltiumFile,
  serializeAltiumPcbToSvg,
} from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import { colorMap, convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { convertAltiumToCircuitJson } from "../../lib"
import { readReferenceBytes } from "./read-reference"
import { stackAltiumAndCircuitJsonSvgs } from "./stack-svg-comparison"

interface OpenSourcePcbComparison {
  circuitJson: AnyCircuitElement[]
  circuitJsonSvg: string
  comparisonSvg: string
}

const INNER_COPPER_OPACITY = 0.25
const INNER_COPPER_COLORS = {
  inner1: withOpacity(colorMap.board.copper.in1, INNER_COPPER_OPACITY),
  inner2: withOpacity(colorMap.board.copper.in2, INNER_COPPER_OPACITY),
  inner3: withOpacity(colorMap.board.copper.in3, INNER_COPPER_OPACITY),
  inner4: withOpacity(colorMap.board.copper.in4, INNER_COPPER_OPACITY),
  inner5: withOpacity(colorMap.board.copper.in5, INNER_COPPER_OPACITY),
  inner6: withOpacity(colorMap.board.copper.in6, INNER_COPPER_OPACITY),
  inner7: withOpacity(colorMap.board.copper.in7, INNER_COPPER_OPACITY),
  inner8: withOpacity(colorMap.board.copper.in8, INNER_COPPER_OPACITY),
}

export async function createOpenSourcePcbComparison({
  filename,
  focusOnBoard = false,
  pcbName,
}: {
  filename: string
  focusOnBoard?: boolean
  pcbName: string
}): Promise<OpenSourcePcbComparison> {
  const source = await readReferenceBytes(filename)
  const document = parseAltiumFile(source).document
  if (
    !(document instanceof AltiumPcbDoc) &&
    !(document instanceof AltiumBinaryPcbDoc)
  ) {
    throw new Error(
      `Expected ${filename} to contain an Altium PCB document, got ${document.type}`,
    )
  }
  const circuitJson = convertAltiumToCircuitJson(source, { sourceType: "pcb" })
  const board = circuitJson.find((element) => element.type === "pcb_board")
  if (!board) throw new Error(`${filename} did not produce a PCB board`)

  const boardBounds = focusOnBoard
    ? getPcbBoardGeometry(document).outline.bounds
    : undefined
  if (focusOnBoard && !boardBounds) {
    throw new Error(`${filename} does not contain an Altium board outline`)
  }
  const boardPadding = boardBounds
    ? Math.max(
        boardBounds.maxX - boardBounds.minX,
        boardBounds.maxY - boardBounds.minY,
      ) * 0.05
    : 0
  const altiumSvg = serializeAltiumPcbToSvg(document, {
    height: 600,
    title: "altiumts source rendering",
    viewBox:
      focusOnBoard && boardBounds
        ? {
            height: boardBounds.maxY - boardBounds.minY + 2 * boardPadding,
            width: boardBounds.maxX - boardBounds.minX + 2 * boardPadding,
            x: boardBounds.minX - boardPadding,
            y: boardBounds.minY - boardPadding,
          }
        : undefined,
    width: 800,
  })
  const circuitJsonSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    colorOverrides: {
      copper: INNER_COPPER_COLORS,
    },
    matchBoardAspectRatio: true,
    viewportTarget: focusOnBoard
      ? { pcb_board_id: board.pcb_board_id }
      : undefined,
  })
  const comparisonSvg = stackAltiumAndCircuitJsonSvgs({
    altiumSvg,
    circuitJsonSvg,
    label: `${pcbName} PCB`,
  })

  return { circuitJson, circuitJsonSvg, comparisonSvg }
}

function withOpacity(rgbColor: string, opacity: number): string {
  const rgbChannels = /^rgb\(([^)]+)\)$/u.exec(rgbColor)?.[1]
  return rgbChannels ? `rgba(${rgbChannels}, ${opacity})` : rgbColor
}
