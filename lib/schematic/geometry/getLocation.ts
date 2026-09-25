import {
  type AltiumPoint,
  type AltiumRecord,
  getSchematicPoint,
} from "altiumts"

export function getLocation(record: AltiumRecord): AltiumPoint | undefined {
  return getSchematicPoint(record, { xKey: "LOCATION.X", yKey: "LOCATION.Y" })
}
