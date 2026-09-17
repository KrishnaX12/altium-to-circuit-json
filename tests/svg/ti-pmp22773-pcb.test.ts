import { expect, test } from "bun:test"
import type { PcbSilkscreenText } from "circuit-json"
import { TI_POWER_REFERENCE_PCB_FILENAMES } from "../../scripts/references/reference-manifest"
import { createOpenSourcePcbComparison } from "../helpers/create-open-source-pcb-comparison"
import { expectValidImportedPcb } from "../helpers/expect-valid-imported-pcb"

test(
  "TI PMP22773 PCB: altiumts SVG on the left, Circuit JSON SVG on the right",
  async () => {
    const { circuitJson, circuitJsonSvg, comparisonSvg } =
      await createOpenSourcePcbComparison({
        filename: TI_POWER_REFERENCE_PCB_FILENAMES.pmp22773,
        focusOnBoard: true,
        pcbName: "TI PMP22773",
      })

    expectValidImportedPcb({ circuitJson, circuitJsonSvg })
    const texts = circuitJson.filter(
      (element): element is PcbSilkscreenText =>
        element.type === "pcb_silkscreen_text",
    )
    expect(texts).toHaveLength(36)
    expect(texts).toContainEqual(
      expect.objectContaining({
        anchor_alignment: "center",
        ccw_rotation: 90,
        is_mirrored: false,
        layer: "top",
        text: "R1",
      }),
    )
    expect(texts).toContainEqual(
      expect.objectContaining({
        anchor_alignment: "center",
        is_mirrored: false,
        layer: "bottom",
        text: "Bottom Overlay",
      }),
    )
    expect(texts.some((text) => text.text.includes(".PRJ_Number"))).toBe(false)
    await expect(comparisonSvg).toMatchSvgSnapshot(import.meta.path)
  },
  { timeout: 40_000 },
)
