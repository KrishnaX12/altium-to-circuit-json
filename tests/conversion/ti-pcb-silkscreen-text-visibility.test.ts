import { expect, test } from "bun:test"
import {
  AltiumBinaryPcbDoc,
  AltiumPcbDoc,
  AltiumTextRecord,
  parseAltiumFile,
} from "altiumts"
import type { PcbSilkscreenText } from "circuit-json"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { TI_POWER_REFERENCE_PCB_FILENAMES } from "../../scripts/references/reference-manifest"
import { readReferenceBytes } from "../helpers/read-reference"

type PcbSilkscreenTextWithHidden = PcbSilkscreenText & {
  is_hidden?: boolean
}

test("preserves TI overlay text and its visibility", async () => {
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
  ).filter(
    (element): element is PcbSilkscreenTextWithHidden =>
      element.type === "pcb_silkscreen_text",
  )

  expect(expectedTextRecords).toHaveLength(14)
  expect(silkscreenTexts).toHaveLength(14)
  expect(
    silkscreenTexts.filter((text) => text.is_hidden === true),
  ).toHaveLength(9)
  expect(silkscreenTexts.find((text) => text.text === "CORE1")?.is_hidden).toBe(
    true,
  )
  expect(silkscreenTexts.find((text) => text.text === "J5")?.is_hidden).toBe(
    undefined,
  )
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
