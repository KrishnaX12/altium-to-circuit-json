import { expect, test } from "bun:test"
import assert from "node:assert/strict"
import { getSchematicRecordPoints, parseAltiumSchDoc } from "altiumts"
import { convertAltiumSchDocToCircuitJson } from "../../lib"
import { getComponentBodyBounds } from "../../lib/schematic/components/getComponentBodyBounds"
import { getPortConnectionGeometry } from "../../lib/schematic/connectivity/getPortConnectionGeometry"
import {
  getCoordinateOrFallback,
  getCorner,
  getLocation,
} from "../../lib/schematic/geometry"
import { renderHierarchicalPort } from "../../lib/schematic/rendering/renderHierarchicalPort"
import { renderPin } from "../../lib/schematic/rendering/renderPin"

test.each([
  ["10", "8000", 10.08],
  ["10", "-8000", 9.92],
  ["-10", "8000", -9.92],
  ["-10", "-8000", -10.08],
  ["0", "-5", -0.00005],
])(
  "converter locations, corners and vertices share %s + %s / 100000",
  (integer, fraction, expected) => {
    const document = parseAltiumSchDoc(
      [
        "|RECORD=31",
        `|RECORD=14|LOCATION.X=${integer}|LOCATION.X_FRAC=${fraction}|LOCATION.Y=20|CORNER.X=30|CORNER.Y=${integer}|CORNER.Y_FRAC=${fraction}`,
        `|RECORD=27|LOCATIONCOUNT=2|X1=${integer}|X1_FRAC=${fraction}|Y1=20|X2=30|Y2=40`,
      ].join("\n"),
    )
    const rectangle = document.records[1]
    const wire = document.wires[0]
    assert(rectangle && wire)
    expect(getLocation(rectangle)).toEqual({ x: expected, y: 20 })
    expect(getCorner(rectangle)).toEqual({ x: 30, y: expected })
    expect(getSchematicRecordPoints(wire)[0]).toEqual({
      x: expected,
      y: 20,
    })
  },
)

test("fraction-only axes use zero while absent geometry stays absent", () => {
  const document = parseAltiumSchDoc(
    "|RECORD=31\n|RECORD=4|LOCATION.X_FRAC=-8000|TEXT=NOTE",
  )
  const label = document.labels[0]
  assert(label)
  expect(getLocation(label)).toEqual({ x: -0.08, y: 0 })
  expect(getCorner(label)).toBeUndefined()
  expect(
    getCoordinateOrFallback({ record: label, key: "LOCATION.X", fallback: 10 }),
  ).toBe(9.92)
})

test("equivalent fixed-point endpoints connect to the same electrical net", () => {
  const circuitJson = convertAltiumSchDocToCircuitJson(
    parseAltiumSchDoc(
      [
        "|RECORD=31",
        "|RECORD=27|LOCATIONCOUNT=2|X1=0|Y1=10|X2=10|X2_FRAC=8000|Y2=10",
        "|RECORD=25|LOCATION.X=11|LOCATION.X_FRAC=-92000|LOCATION.Y=10|TEXT=SIGNAL",
      ].join("\n"),
    ),
  )
  const traces = circuitJson.filter(
    (element) => element.type === "source_trace",
  )
  expect(traces).toHaveLength(1)
  expect(traces[0]?.connected_source_net_ids).toEqual([
    "source_net_altium_signal",
  ])
})

test("signed pin length and port width agree between graphics and connection geometry", () => {
  const document = parseAltiumSchDoc(
    [
      "|RECORD=31",
      "|RECORD=2|LOCATION.X=10|LOCATION.Y=20|PINLENGTH=10|PINLENGTH_FRAC=-8000",
      "|RECORD=18|LOCATION.X=10|LOCATION.Y=20|WIDTH=16|WIDTH_FRAC=-8000|HEIGHT=10|HEIGHT_FRAC=8000|CONNECTEDEND=2",
    ].join("\n"),
  )
  const context = { document, records: document.records, scale: 1 }
  const pin = document.pins[0]
  const port = document.ports[0]
  assert(pin && port)
  const pinLine = renderPin({
    record: pin,
    index: 1,
    context,
    options: { includeText: false },
    color: "#000000",
  })[0]
  expect(pinLine).toMatchObject({
    type: "schematic_line",
    x1: 10,
    y1: 20,
    x2: 19.92,
    y2: 20,
  })
  expect(pin.pinLengthSchematicUnits).toBe(9.92)
  expect(getPortConnectionGeometry(port, [])?.anchor).toEqual({
    x: 25.92,
    y: 20,
  })
  const portBody = renderHierarchicalPort({
    record: port,
    index: 2,
    context,
    options: { includeText: false },
    color: "#000000",
  })[0]
  expect(portBody).toMatchObject({
    type: "schematic_path",
    points: [
      { x: 10, y: 25.04 },
      { x: 25.92, y: 25.04 },
      { x: 25.92, y: 14.96 },
      { x: 10, y: 14.96 },
    ],
  })
})

test("ellipse bounds use the same fractional radii as rendering", () => {
  const document = parseAltiumSchDoc(
    "|RECORD=31\n|RECORD=8|LOCATION.X=10|LOCATION.Y=20|RADIUS=2|RADIUS_FRAC=-8000|SECONDARYRADIUS=3|SECONDARYRADIUS_FRAC=8000",
  )
  const ellipse = document.records[1]
  assert(ellipse)
  expect(getComponentBodyBounds([ellipse], [])).toEqual({
    minX: 8.08,
    maxX: 11.92,
    minY: 16.92,
    maxY: 23.08,
  })
})
