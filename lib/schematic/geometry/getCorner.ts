import {
  type AltiumPoint,
  type AltiumRecord,
  getSchematicPoint,
} from "altiumts"

export function getCorner(record: AltiumRecord): AltiumPoint | undefined {
  return getSchematicPoint(record, { xKey: "CORNER.X", yKey: "CORNER.Y" })
}
