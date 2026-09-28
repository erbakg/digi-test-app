import type { GeoJsonFeatureCollection } from "@/shared/types/geo";
import type { TimePointId } from "./time";

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
  /** Per-layer signal used by Vedro selectors without serializing layer data. */
  readonly version: number;
  readonly enabled: boolean;
  readonly opacity: number;
  /** Monotonically increasing generation. It makes every enable/retry a new query. */
  readonly requestGeneration: number;
  /** Query projection kept in Vedro for map/timeline/chart synchronization. */
  readonly status: LayerStatus;
  readonly data: LayerData | undefined;
  readonly errorMessage: string | undefined;
};

export type LayerRuntimeState = Pick<LayerState, "status" | "data" | "errorMessage">;

export type LayerData = {
  readonly layerId: LayerId;
  readonly loadedAt: string;
  readonly series: readonly LayerDataPoint[];
};

export type LayerDataPoint = {
  readonly timeId: TimePointId;
  readonly value: number;
  readonly unit: string;
  readonly geometry: GeoJsonFeatureCollection;
};

export const getLayerDataPoint = (
  data: LayerData | undefined,
  timeId: TimePointId,
): LayerDataPoint | undefined => data?.series.find((point) => point.timeId === timeId);
