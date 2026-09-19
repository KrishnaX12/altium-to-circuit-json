import { expect, test } from "bun:test"
import {
  AltiumFillRecord,
  AltiumPadRecord,
  parseAltiumBinaryPcbDoc,
  parseAltiumPcbDoc,
} from "altiumts"
import { any_circuit_element } from "circuit-json"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { TI_POWER_REFERENCE_PCB_FILENAMES } from "../../scripts/references/reference-manifest"
import { readReferenceBytes } from "../helpers/read-reference"

const isolatedBottomPasteDocument = parseAltiumPcbDoc(
  [
    "|RECORD=Board|SHEETWIDTH=500mil|SHEETHEIGHT=400mil",
    "|RECORD=Pad|LAYER=BOTTOMPASTE|X=100mil|Y=100mil|XSIZE=90mil|YSIZE=50mil|BOTTOMXSIZE=80mil|BOTTOMYSIZE=40mil|SHAPE=ROUND|BOTTOMSHAPE=ROUND|LAYER31ALTSHAPE=ROUNDRECT|LAYER31CORNERRADIUS=25|ROTATION=90",
    "|RECORD=Fill|LAYER=BOTTOMPASTE|X1=200mil|Y1=100mil|X2=260mil|Y2=140mil|ROTATION=30",
  ].join("\n"),
)

test("converts bottom paste pads and fills without electrical pads", () => {
  const sourceBottomPasteRecords = isolatedBottomPasteDocument.records.filter(
    isSupportedBottomPasteRecord,
  )
  const circuitJson = convertAltiumPcbDocToCircuitJson(
    isolatedBottomPasteDocument,
  )
  const solderPaste = circuitJson.filter(
    (element) => element.type === "pcb_solder_paste",
  )

  expect(solderPaste).toHaveLength(sourceBottomPasteRecords.length)
  expect(solderPaste.map((element) => element.shape)).toEqual([
    "rotated_pill",
    "rotated_rect",
  ])
  expect(
    solderPaste.every(
      (element) => any_circuit_element.safeParse(element).success,
    ),
  ).toBe(true)
  expect(circuitJson.some((element) => element.type === "pcb_smtpad")).toBe(
    false,
  )

  const withoutPaste = convertAltiumPcbDocToCircuitJson(
    isolatedBottomPasteDocument,
    { includeSolderPaste: false },
  )
  expect(
    withoutPaste.some(
      (element) =>
        element.type === "pcb_solder_paste" || element.type === "pcb_smtpad",
    ),
  ).toBe(false)
})

test(
  "converts every supported PMP23595 bottom paste record",
  async () => {
    const source = await readReferenceBytes(
      TI_POWER_REFERENCE_PCB_FILENAMES.pmp23595,
    )
    const document = parseAltiumBinaryPcbDoc(source)
    const sourceBottomPasteRecords = document.records.filter(
      isSupportedBottomPasteRecord,
    )
    const circuitJson = convertAltiumPcbDocToCircuitJson(document)
    const solderPaste = circuitJson.filter(
      (element) => element.type === "pcb_solder_paste",
    )

    expect(sourceBottomPasteRecords.length).toBeGreaterThan(0)
    expect(solderPaste).toHaveLength(sourceBottomPasteRecords.length)
    expect(solderPaste.every((element) => element.layer === "bottom")).toBe(
      true,
    )
    expect(
      solderPaste.every(
        (element) => any_circuit_element.safeParse(element).success,
      ),
    ).toBe(true)
  },
  { timeout: 600_000 },
)

function isSupportedBottomPasteRecord(
  record: (typeof isolatedBottomPasteDocument.records)[number],
): boolean {
  const normalizedLayer = (record.getDecoded("LAYER") ?? "")
    .replace(/[\s_.-]+/gu, "")
    .toUpperCase()
  return (
    normalizedLayer === "BOTTOMPASTE" &&
    (record instanceof AltiumPadRecord || record instanceof AltiumFillRecord)
  )
}
