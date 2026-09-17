import { expect, test } from "bun:test"
import type { PcbSilkscreenText } from "circuit-json"
import { TI_POWER_REFERENCE_PCB_FILENAMES } from "../../scripts/references/reference-manifest"
import { createOpenSourcePcbComparison } from "../helpers/create-open-source-pcb-comparison"
import { expectValidImportedPcb } from "../helpers/expect-valid-imported-pcb"

test(
  "TI PMP22712 PCB: altiumts SVG on the left, Circuit JSON SVG on the right",
  async () => {
    const { circuitJson, circuitJsonSvg, comparisonSvg } =
      await createOpenSourcePcbComparison({
        filename: TI_POWER_REFERENCE_PCB_FILENAMES.pmp22712,
        focusOnBoard: true,
        pcbName: "TI PMP22712",
      })

    expectValidImportedPcb({ circuitJson, circuitJsonSvg })
    const texts = circuitJson.filter(
      (element): element is PcbSilkscreenText =>
        element.type === "pcb_silkscreen_text",
    )
    expect(texts).toHaveLength(28)
    expect(texts).toContainEqual(
      expect.objectContaining({
        anchor_alignment: "top_left",
        text: "For evaluation only; not FCC approved for resale.",
      }),
    )
    expect(texts).toContainEqual(
      expect.objectContaining({
        anchor_alignment: "bottom_left",
        ccw_rotation: 270,
        is_mirrored: true,
        layer: "bottom",
        text: "D4",
      }),
    )
    expect(texts.map((text) => text.text)).toEqual(
      expect.arrayContaining(["Top Overlay", "Bottom Overlay"]),
    )
    expect(texts.some((text) => text.text.includes(".PRJ_Number"))).toBe(false)
    await expect(comparisonSvg).toMatchSvgSnapshot(import.meta.path)
  },
  { timeout: 40_000 },
)
