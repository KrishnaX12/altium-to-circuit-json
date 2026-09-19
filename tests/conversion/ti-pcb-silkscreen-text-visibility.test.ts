import { expect, test } from "bun:test"
import {
  AltiumBinaryPcbDoc,
  AltiumPcbDoc,
  type AltiumPcbDocument,
  AltiumTextRecord,
  parseAltiumFile,
} from "altiumts"
import type { PcbSilkscreenText } from "circuit-json"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { TI_POWER_REFERENCE_PCB_FILENAMES } from "../../scripts/references/reference-manifest"
import { readReferenceBytes } from "../helpers/read-reference"

type PcbSilkscreenTextWithVisibility = PcbSilkscreenText & {
  is_visible?: boolean
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
  const expectedVisibleTextRecords = expectedTextRecords.filter((record) =>
    isVisibleOverlayTextRecord({ document: parsedDocument, record }),
  )
  const silkscreenTexts = convertAltiumPcbDocToCircuitJson(
    parsedDocument,
  ).filter(
    (element): element is PcbSilkscreenTextWithVisibility =>
      element.type === "pcb_silkscreen_text",
  )

  expect(silkscreenTexts).toHaveLength(expectedTextRecords.length)
  expect(
    silkscreenTexts.filter((text) => text.is_visible !== false),
  ).toHaveLength(expectedVisibleTextRecords.length)
  expect(silkscreenTexts.find((text) => text.text === "J5")?.is_visible).toBe(
    true,
  )
})

function isOverlayTextRecord(record: AltiumTextRecord): boolean {
  const sourceText =
    record.getDecoded("WIDESTRING") ?? record.getDecoded("TEXT") ?? record.text
  return Boolean(isOverlayLayer(record.layer) && record.position && sourceText)
}

function isVisibleOverlayTextRecord({
  document,
  record,
}: {
  document: AltiumPcbDocument
  record: AltiumTextRecord
}): boolean {
  const component = document.getComponentForRecord(record)
  if (!component) return true
  if (record.isDesignator) return component.getBoolean("NAMEON") ?? true
  if (record.isComment) return component.getBoolean("COMMENTON") ?? true
  return true
}

function isOverlayLayer(layer: string | undefined): boolean {
  const normalizedLayer = (layer ?? "").replace(/[\s_.-]+/gu, "").toUpperCase()
  return normalizedLayer === "TOPOVERLAY" || normalizedLayer === "BOTTOMOVERLAY"
}
