import { expect, test } from "bun:test"
import { parseAltiumPcbDoc } from "altiumts"
import type { PcbSilkscreenText } from "circuit-json"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"

const boardRecord =
  "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=500mil|KIND3=0|VX3=0mil|VY3=500mil"

test("maps Altium text justification, rotation, and mirroring", () => {
  const expectedAnchors: NonNullable<PcbSilkscreenText["anchor_alignment"]>[] =
    [
      "top_left",
      "center_left",
      "bottom_left",
      "top_center",
      "center",
      "bottom_center",
      "top_right",
      "center_right",
      "bottom_right",
    ]
  const textRecords = expectedAnchors.map(
    (_, index) =>
      `|RECORD=Text|LAYER=TOPOVERLAY|X=${index * 20}mil|Y=20mil|HEIGHT=10mil|TEXT=T${index + 1}|JUSTIFICATION=${index + 1}|ROTATION=${index * 45}|MIRROR=${index === 0 ? "TRUE" : "FALSE"}`,
  )
  const document = parseAltiumPcbDoc([boardRecord, ...textRecords].join("\n"))

  const texts = getSilkscreenTexts(convertAltiumPcbDocToCircuitJson(document))

  expect(texts.map((text) => text.anchor_alignment)).toEqual(expectedAnchors)
  expect(texts.map((text) => text.ccw_rotation)).toEqual([
    0, 45, 90, 135, 180, 225, 270, 315, 0,
  ])
  expect(texts[0]?.is_mirrored).toBe(true)
  expect(texts.slice(1).every((text) => text.is_mirrored === false)).toBe(true)
})

test("honors component designator and comment visibility", () => {
  const document = parseAltiumPcbDoc(
    [
      boardRecord,
      "|RECORD=Component|ID=0|LAYER=TOP|X=0mil|Y=0mil|NAMEON=TRUE|COMMENTON=FALSE",
      "|RECORD=Component|ID=1|LAYER=TOP|X=100mil|Y=0mil|NAMEON=FALSE|COMMENTON=TRUE",
      "|RECORD=Text|COMPONENT=0|LAYER=TOPOVERLAY|X=10mil|Y=10mil|HEIGHT=10mil|TEXT=R1|DESIGNATOR=TRUE|JUSTIFICATION=3",
      "|RECORD=Text|COMPONENT=0|LAYER=TOPOVERLAY|X=20mil|Y=10mil|HEIGHT=10mil|TEXT=10k|COMMENT=TRUE|JUSTIFICATION=3",
      "|RECORD=Text|COMPONENT=1|LAYER=TOPOVERLAY|X=30mil|Y=10mil|HEIGHT=10mil|TEXT=C1|DESIGNATOR=TRUE|JUSTIFICATION=3",
      "|RECORD=Text|COMPONENT=1|LAYER=TOPOVERLAY|X=40mil|Y=10mil|HEIGHT=10mil|TEXT=22uF|COMMENT=TRUE|JUSTIFICATION=3",
    ].join("\n"),
  )

  const texts = getSilkscreenTexts(convertAltiumPcbDocToCircuitJson(document))

  expect(texts.map((text) => text.text)).toEqual(["R1", "22uF"])
})

function getSilkscreenTexts(
  circuitJson: ReturnType<typeof convertAltiumPcbDocToCircuitJson>,
): PcbSilkscreenText[] {
  return circuitJson.filter(
    (element): element is PcbSilkscreenText =>
      element.type === "pcb_silkscreen_text",
  )
}
