import { expect, test } from "bun:test"
import {
  AltiumRegionRecord,
  AltiumTrackRecord,
  parseAltiumBinaryPcbDoc,
} from "altiumts"
import { convertAltiumPcbDocToCircuitJson } from "../../lib"
import { readReferenceBytes } from "../helpers/read-reference"

test("uses the saved TI PMP23595 stack order for its copper tracks and pours", async () => {
  const document = parseAltiumBinaryPcbDoc(
    await readReferenceBytes("ti-pmp23595.PcbDoc"),
  )
  const circuit = convertAltiumPcbDocToCircuitJson(document)
  const traces = new Map(
    circuit
      .filter((element) => element.type === "pcb_trace")
      .map((trace) => [trace.pcb_trace_id, trace]),
  )
  const expectedLayers = [
    ["MID-LAYER3", "inner1"],
    ["MID-LAYER1", "inner2"],
    ["MID-LAYER2", "inner3"],
    ["MID-LAYER4", "inner4"],
  ] as const
  for (const [sourceLayer, expectedLayer] of expectedLayers) {
    const records = document.records.flatMap((record, index) =>
      record instanceof AltiumTrackRecord && record.layer === sourceLayer
        ? [index]
        : [],
    )
    const regions = document.records.flatMap((record, index) =>
      record instanceof AltiumRegionRecord &&
      record.recordKind === "Region" &&
      record.layer === sourceLayer
        ? [index]
        : [],
    )
    expect(regions.length).toBeGreaterThan(0)
    for (const index of regions) {
      const pour = circuit.find(
        (element) =>
          element.type === "pcb_copper_pour" &&
          element.pcb_copper_pour_id ===
            `pcb_copper_pour_altium_region_${index}`,
      )
      expect(pour?.type === "pcb_copper_pour" ? pour.layer : undefined).toBe(
        expectedLayer,
      )
    }
    for (const index of records) {
      const trace = traces.get(`pcb_trace_altium_${index}`)
      expect(trace).toBeDefined()
      expect(
        trace?.route.map((point) =>
          point.route_type === "wire" ? point.layer : undefined,
        ),
      ).toEqual([expectedLayer, expectedLayer])
    }
  }
  expect(
    circuit.find((element) => element.type === "pcb_board")?.num_layers,
  ).toBe(6)
})
