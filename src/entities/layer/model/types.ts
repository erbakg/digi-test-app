import type { GeoJsonFeatureCollection } from "@/shared/types/geo";

export const LAYER_IDS = ["temperature", "wind", "insolation"] as const;

export type LayerId = string & { readonly __layerId: unique symbol };

export const toLayerId = (value: string): LayerId => value as LayerId;

export type LayerStatus = "disabled" | "loading" | "success" | "error";

export type LayerDefinition = {
  readonly id: LayerId;
  readonly title: string;
  readonly description: string;
  readonly unit: string;
  readonly icon: string;
  readonly accent: string;
  readonly chartColor: string;
  readonly mapColor: string;
};

export type LayerState = {
  readonly enabled: boolean;
  readonly opacity: number;
  /** Monotonically increasing generation. It makes every enable/retry a new query. */
  readonly requestGeneration: number;
};

export type LayerData = {
  readonly layerId: LayerId;
  readonly value: number;
  readonly unit: string;
  readonly loadedAt: string;
  readonly geometry: GeoJsonFeatureCollection;
};
