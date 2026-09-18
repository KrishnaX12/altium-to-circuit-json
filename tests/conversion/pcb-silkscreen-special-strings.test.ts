import { expect, test } from "bun:test"
import { AltiumTextRecord, parseAltiumPcbDoc } from "altiumts"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { resolveAltiumSpecialStrings } from "../../lib/pcb/resolve-altium-special-strings"

const BOARD_RECORD =
  "|RECORD=Board|VERSION=5.0|LAYER_V8_1NAME=Top Overlay|LAYER_V8_1LAYERID=TOPOVERLAY|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=500mil|KIND3=0|VX3=0mil|VY3=500mil"

function convertSilkscreenText(sourceTexts: string[]): string[] {
  const document = parseAltiumPcbDoc(
    [
      BOARD_RECORD,
      ...sourceTexts.map(
        (sourceText, index) =>
          `|RECORD=Text|LAYER=TOPOVERLAY|X=${index * 50}mil|Y=100mil|HEIGHT=20mil|TEXT=${sourceText}`,
      ),
    ].join("\n"),
  )

  return convertAltiumPcbDocToCircuitJson(document)
    .filter((element) => element.type === "pcb_silkscreen_text")
    .map((element) => element.text)
}

test("resolves standalone and embedded layer names", () => {
  expect(convertSilkscreenText([".Layer_Name", "Rev: '.Layer_Name'"])).toEqual([
    "Top Overlay",
    "Rev: Top Overlay",
  ])
})

test("does not treat decimal-like text as a special string", () => {
  expect(convertSilkscreenText([".1uF", ".062", ".100 PITCH"])).toEqual([
    ".1uF",
    ".062",
    ".100 PITCH",
  ])
})

test("preserves unknown special strings", () => {
  expect(convertSilkscreenText([".Foo"])).toEqual([".Foo"])
})

test("uses a standard overlay name when the layer stack omits it", () => {
  const document = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0",
      "|RECORD=Text|LAYER=BOTTOMOVERLAY|X=0mil|Y=0mil|HEIGHT=20mil|TEXT=.Layer_Name",
    ].join("\n"),
  )

  const silkscreenText = convertAltiumPcbDocToCircuitJson(document).find(
    (element) => element.type === "pcb_silkscreen_text",
  )

  expect(silkscreenText?.text).toBe("Bottom Overlay")
})

test("preserves the layer placeholder when no display name is available", () => {
  const document = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0",
      "|RECORD=Text|LAYER=MECHANICAL99|X=0mil|Y=0mil|HEIGHT=20mil|TEXT=.Layer_Name",
    ].join("\n"),
  )
  const record = document.records.find(
    (candidate) => candidate instanceof AltiumTextRecord,
  )
  if (!(record instanceof AltiumTextRecord)) {
    throw new Error("Expected an Altium text record")
  }

  expect(
    resolveAltiumSpecialStrings({
      document,
      record,
      sourceText: record.text ?? "",
    }),
  ).toBe(".Layer_Name")
})
