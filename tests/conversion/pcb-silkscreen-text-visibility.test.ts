import { expect, test } from "bun:test"
import { parseAltiumPcbDoc } from "altiumts"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"

test("honors component designator and comment visibility", () => {
  const document = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=500mil|KIND3=0|VX3=0mil|VY3=500mil",
      "|RECORD=Component|ID=0|LAYER=TOP|X=0mil|Y=0mil|NAMEON=TRUE|COMMENTON=FALSE",
      "|RECORD=Component|ID=1|LAYER=TOP|X=100mil|Y=0mil|NAMEON=FALSE|COMMENTON=TRUE",
      "|RECORD=Component|ID=2|LAYER=TOP|X=200mil|Y=0mil",
      "|RECORD=Text|COMPONENT=0|LAYER=TOPOVERLAY|X=10mil|Y=10mil|HEIGHT=10mil|TEXT=R1|DESIGNATOR=TRUE",
      "|RECORD=Text|COMPONENT=0|LAYER=TOPOVERLAY|X=20mil|Y=10mil|HEIGHT=10mil|TEXT=10k|COMMENT=TRUE",
      "|RECORD=Text|COMPONENT=0|LAYER=TOPOVERLAY|X=25mil|Y=10mil|HEIGHT=10mil|TEXT=ASSEMBLY NOTE",
      "|RECORD=Text|COMPONENT=1|LAYER=TOPOVERLAY|X=30mil|Y=10mil|HEIGHT=10mil|TEXT=C1|DESIGNATOR=TRUE",
      "|RECORD=Text|COMPONENT=1|LAYER=TOPOVERLAY|X=40mil|Y=10mil|HEIGHT=10mil|TEXT=22uF|COMMENT=TRUE",
      "|RECORD=Text|COMPONENT=2|LAYER=TOPOVERLAY|X=50mil|Y=10mil|HEIGHT=10mil|TEXT=U3|DESIGNATOR=TRUE",
      "|RECORD=Text|COMPONENT=2|LAYER=TOPOVERLAY|X=60mil|Y=10mil|HEIGHT=10mil|TEXT=MCU|COMMENT=TRUE",
      "|RECORD=Text|COMPONENT=65535|LAYER=TOPOVERLAY|X=70mil|Y=10mil|HEIGHT=10mil|TEXT=BOARD LABEL",
      "|RECORD=Text|COMPONENT=0|LAYER=TOPOVERLAY|X=80mil|Y=10mil|HEIGHT=10mil|TEXT=BOTH FLAGS|DESIGNATOR=TRUE|COMMENT=TRUE",
    ].join("\n"),
  )

  const silkscreenText = convertAltiumPcbDocToCircuitJson(document)
    .filter((element) => element.type === "pcb_silkscreen_text")
    .map((element) => ({
      isHidden: "is_hidden" in element && element.is_hidden === true,
      text: element.text,
    }))

  expect(silkscreenText).toEqual([
    { text: "R1", isHidden: false },
    { text: "10k", isHidden: true },
    { text: "ASSEMBLY NOTE", isHidden: false },
    { text: "C1", isHidden: true },
    { text: "22uF", isHidden: false },
    { text: "U3", isHidden: false },
    { text: "MCU", isHidden: false },
    { text: "BOARD LABEL", isHidden: false },
    { text: "BOTH FLAGS", isHidden: true },
  ])
})
