import { expect, test } from "bun:test"
import {
  AltiumBinaryPcbDoc,
  AltiumPcbDoc,
  AltiumTextRecord,
  parseAltiumFile,
} from "altiumts"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { TI_POWER_REFERENCE_PCB_FILENAMES } from "../../scripts/references/reference-manifest"
import { readReferenceBytes } from "../helpers/read-reference"

test("omits hidden TI component overlay text", async () => {
  const filename = TI_POWER_REFERENCE_PCB_FILENAMES.pmp23653PlanarTransformer
  const referenceBytes = await readReferenceBytes(filename)
  const parsedDocument = parseAltiumFile(referenceBytes).document
  if (
    !(parsedDocument instanceof AltiumPcbDoc) &&
    !(parsedDocument instanceof AltiumBinaryPcbDoc)
  ) {
    throw new Error(`Expected ${filename} to contain an Altium PCB document`)
  }

  const expectedTextRecords = parsedDocument.records.filter(
    (record): record is AltiumTextRecord =>
      record instanceof AltiumTextRecord && isOverlayTextRecord(record),
  )
  const silkscreenTexts = convertAltiumPcbDocToCircuitJson(
    parsedDocument,
  ).filter((element) => element.type === "pcb_silkscreen_text")

  expect(expectedTextRecords).toHaveLength(14)
  expect(silkscreenTexts).toHaveLength(5)
  expect(silkscreenTexts.some((text) => text.text === "CORE1")).toBe(false)
  expect(silkscreenTexts.some((text) => text.text === "J5")).toBe(true)
})

function isOverlayTextRecord(record: AltiumTextRecord): boolean {
  const sourceText =
    record.getDecoded("WIDESTRING") ?? record.getDecoded("TEXT") ?? record.text
  return Boolean(isOverlayLayer(record.layer) && record.position && sourceText)
}

function isOverlayLayer(layer: string | undefined): boolean {
  const normalizedLayer = (layer ?? "").replace(/[\s_.-]+/gu, "").toUpperCase()
  return normalizedLayer === "TOPOVERLAY" || normalizedLayer === "BOTTOMOVERLAY"
}
