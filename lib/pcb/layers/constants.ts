import { all_layers } from "circuit-json"

export const INNER_LAYERS = all_layers.filter((layer) =>
  layer.startsWith("inner"),
)
