import { expect, test } from "bun:test"
import { parseAltiumPcbDoc } from "altiumts"
import { any_circuit_element } from "circuit-json"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"

function modernBoard(layers: Array<[string, number]>): string {
  return `|RECORD=Board${layers
    .map(
      ([name, id], index) =>
        `|LAYER_V8_${index}NAME=${name}|LAYER_V8_${index}LAYERID=${id}|LAYER_V8_${index}COPTHICK=1.4mil`,
    )
    .join("")}`
}

function track(layer: string): string {
  return `|RECORD=Track|LAYER=${layer}|X1=0mil|Y1=0mil|X2=100mil|Y2=0mil|WIDTH=10mil`
}

function convert(records: string[]) {
  return convertAltiumPcbDocToCircuitJson(parseAltiumPcbDoc(records.join("\n")))
}

const mixedStack: Array<[string, number]> = [
  ["Top Layer", 0x1000001],
  ["Ground plane", 0x1010001],
  ["Signal 30", 0x100001f],
  ["Signal 1", 0x1000002],
  ["Signal 8", 0x1000009],
  ["Signal 9", 0x100000a],
  ["Bottom Layer", 0x100ffff],
]

test("maps sparse signal and plane identities in physical stack order", () => {
  const circuit = convert([
    modernBoard(mixedStack),
    ...[
      "TOP",
      "INTERNALPLANE1",
      "MID-LAYER30",
      "MID-LAYER1",
      "MID-LAYER8",
      "MID-LAYER9",
      "BOTTOM",
      "Ground plane",
      "Signal 30",
      "16777218",
      "PLANE1",
      "mid_8",
    ].map(track),
  ])
  const traces = circuit.filter((element) => element.type === "pcb_trace")
  expect(
    traces.map(
      (trace) =>
        trace.route.find((point) => point.route_type === "wire")?.layer,
    ),
  ).toEqual([
    "top",
    "inner1",
    "inner2",
    "inner3",
    "inner4",
    "inner5",
    "bottom",
    "inner1",
    "inner2",
    "inner3",
    "inner1",
    "inner4",
  ])
  expect(
    circuit.find((element) => element.type === "pcb_board")?.num_layers,
  ).toBe(7)
  expect(
    circuit.every((element) => any_circuit_element.safeParse(element).success),
  ).toBe(true)
})

test("uses legacy NEXT links instead of numeric layer indexes and ignores inactive layers", () => {
  const circuit = convert([
    "|RECORD=Board|LAYER1NAME=Top Layer|LAYER1PREV=0|LAYER1NEXT=39|LAYER2NAME=Signal|LAYER2PREV=39|LAYER2NEXT=32|LAYER3NAME=Unused|LAYER3PREV=0|LAYER3NEXT=0|LAYER32NAME=Bottom Layer|LAYER32PREV=2|LAYER32NEXT=0|LAYER39NAME=Ground|LAYER39PREV=1|LAYER39NEXT=2",
    track("INTERNALPLANE1"),
    track("MID-LAYER1"),
  ])
  expect(
    circuit
      .filter((element) => element.type === "pcb_trace")
      .map(
        (trace) =>
          trace.route.find((point) => point.route_type === "wire")?.layer,
      ),
  ).toEqual(["inner1", "inner2"])
  expect(
    circuit.find((element) => element.type === "pcb_board")?.num_layers,
  ).toBe(4)
})

test("uses v7 links and does not count v7 entries twice when v8 is present", () => {
  const v7 =
    "|LAYERV7_0NAME=Top Layer|LAYERV7_0LAYERID=16777217|LAYERV7_0NEXT=16842753|LAYERV7_1NAME=MidLayer1|LAYERV7_1LAYERID=16777218|LAYERV7_1NEXT=16842751|LAYERV7_2NAME=Bottom Layer|LAYERV7_2LAYERID=16842751|LAYERV7_2NEXT=16973824|LAYERV7_3NAME=InternalPlane1|LAYERV7_3LAYERID=16842753|LAYERV7_3NEXT=16777218"
  for (const board of ["|RECORD=Board", modernBoard(mixedStack)]) {
    const circuit = convert([board + v7, track("INTERNALPLANE1")])
    const trace = circuit.find((element) => element.type === "pcb_trace")
    expect(
      trace?.route.find((point) => point.route_type === "wire")?.layer,
    ).toBe("inner1")
    expect(
      circuit.find((element) => element.type === "pcb_board")?.num_layers,
    ).toBe(board === "|RECORD=Board" ? 4 : 7)
  }
})

test("shares stack mapping across copper primitives, via endpoints and keepouts", () => {
  const outline =
    "|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=100mil|VY1=0mil|KIND2=0|VX2=100mil|VY2=100mil|KIND3=0|VX3=0mil|VY3=0mil"
  const circuit = convert([
    modernBoard(mixedStack),
    track("MID-LAYER30"),
    "|RECORD=Arc|LAYER=MID-LAYER30|LOCATION.X=50mil|LOCATION.Y=50mil|RADIUS=20mil|STARTANGLE=0|ENDANGLE=90|WIDTH=5mil",
    "|RECORD=Pad|LAYER=MID-LAYER30|X=50mil|Y=50mil|XSIZE=20mil|YSIZE=20mil|SHAPE=RECTANGLE",
    "|RECORD=Text|LAYER=MID-LAYER30|X=50mil|Y=50mil|TEXT=Copper|HEIGHT=20mil",
    "|RECORD=Fill|LAYER=MID-LAYER30|X1=0mil|Y1=0mil|X2=100mil|Y2=100mil",
    `|RECORD=Polygon|LAYER=MID-LAYER30${outline}`,
    `|RECORD=Region|LAYER=MID-LAYER30|REGIONKIND=COPPER${outline}`,
    "|RECORD=Via|X=50mil|Y=50mil|DIAMETER=20mil|HOLESIZE=10mil|STARTLAYER=INTERNALPLANE1|ENDLAYER=MID-LAYER30",
    "|RECORD=Arc|LAYER=KEEPOUT|LOCATION.X=50mil|LOCATION.Y=50mil|RADIUS=20mil|STARTANGLE=0|ENDANGLE=360|WIDTH=5mil",
  ])
  expect(
    circuit
      .filter((element) => element.type === "pcb_trace")
      .map(
        (trace) =>
          trace.route.find((point) => point.route_type === "wire")?.layer,
      ),
  ).toEqual(["inner2", "inner2"])
  const copper = circuit.filter(
    (element) =>
      element.type === "pcb_smtpad" ||
      element.type === "pcb_copper_text" ||
      element.type === "pcb_copper_pour",
  )
  expect(copper).toHaveLength(5)
  expect(copper.map((element) => element.layer)).toEqual(
    Array(5).fill("inner2"),
  )
  expect(circuit.find((element) => element.type === "pcb_via")?.layers).toEqual(
    ["inner1", "inner2"],
  )
  expect(
    circuit.find((element) => element.type === "pcb_keepout")?.layers,
  ).toEqual(["top", "inner1", "inner2", "inner3", "inner4", "inner5", "bottom"])
})

test("rejects stacks beyond Circuit JSON capacity instead of clamping", () => {
  const stack: Array<[string, number]> = [
    ["Top", 0x1000001],
    ...Array.from({ length: 9 }, (_, index): [string, number] => [
      `Signal ${index + 1}`,
      0x1000002 + index,
    ]),
    ["Bottom", 0x100ffff],
  ]
  expect(() => convert([modernBoard(stack), track("MID-LAYER9")])).toThrow(
    /11 copper layers.*at most 10/i,
  )
})

test("supports all eight inner positions without merging the last two", () => {
  const stack: Array<[string, number]> = [
    ["Top", 0x1000001],
    ...Array.from({ length: 8 }, (_, index): [string, number] => [
      `Signal ${index + 1}`,
      0x1000002 + index,
    ]),
    ["Bottom", 0x100ffff],
  ]
  const circuit = convert([
    modernBoard(stack),
    track("MID-LAYER7"),
    track("MID-LAYER8"),
  ])
  expect(
    circuit
      .filter((element) => element.type === "pcb_trace")
      .map(
        (trace) =>
          trace.route.find((point) => point.route_type === "wire")?.layer,
      ),
  ).toEqual(["inner7", "inner8"])
  expect(
    circuit.find((element) => element.type === "pcb_board")?.num_layers,
  ).toBe(10)
})

test.each(["MID-LAYER0", "MID-LAYER31", "INTERNALPLANE0", "INTERNALPLANE17"])(
  "rejects invalid copper identity %s",
  (layer) => {
    expect(() => convert([modernBoard(mixedStack), track(layer)])).toThrow(
      /unsupported.*copper layer/i,
    )
  },
)

test("does not mistake inner layers for missing outer layers", () => {
  expect(() =>
    convert([
      modernBoard([
        ["MidLayer1", 0x1000002],
        ["MidLayer2", 0x1000003],
      ]),
    ]),
  ).toThrow(/outer layers/i)
})

test.each(["MID-LAYER8", "MID-LAYER9", "MID-LAYER30", "INTERNALPLANE1"])(
  "rejects %s when board stack information is absent",
  (layer) => {
    expect(() => convert(["|RECORD=Board", track(layer)])).toThrow(
      /copper layer.*board stack/i,
    )
  },
)

test("rejects layers outside the declared stack and invalid via endpoints", () => {
  expect(() => convert([modernBoard(mixedStack), track("MID-LAYER2")])).toThrow(
    /copper layer.*board stack/i,
  )
  expect(() =>
    convert([
      modernBoard(mixedStack),
      "|RECORD=Via|X=0mil|Y=0mil|STARTLAYER=MECHANICAL1|ENDLAYER=BOTTOM",
    ]),
  ).toThrow(/via.*layer/i)
})

test("rejects ambiguous copper aliases and cyclic legacy stacks", () => {
  expect(() =>
    convert([
      modernBoard([
        ["Top", 0x1000001],
        ["Same", 0x1000002],
        ["Same", 0x1010001],
        ["Bottom", 0x100ffff],
      ]),
    ]),
  ).toThrow(/ambiguous copper layer/i)
  expect(() =>
    convert([
      "|RECORD=Board|LAYER1NAME=Top|LAYER1NEXT=2|LAYER2NAME=MidLayer1|LAYER2NEXT=1|LAYER32NAME=Bottom|LAYER32NEXT=0",
      track("MID-LAYER1"),
    ]),
  ).toThrow(/copper.*stack/i)
})

test("does not let a custom name impersonate a different copper layer ID", () => {
  expect(() =>
    convert([
      modernBoard([
        ["Top", 0x1000001],
        ["MidLayer1", 0x1010001],
        ["Bottom", 0x100ffff],
      ]),
      track("MID-LAYER1"),
    ]),
  ).toThrow(/ambiguous copper layer/i)
})
