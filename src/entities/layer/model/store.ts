import Vedro from "vedro";
import { createLayerDefinitions } from "./config";
import { DEFAULT_TIME_POINT_ID, isTimePointId, type TimePointId } from "./time";
import type {
  LayerDefinition,
  LayerId,
  LayerRuntimeState,
  LayerState,
} from "./types";

export type LayerStoreSnapshot = {
  readonly byId: Readonly<Record<LayerId, LayerState>>;
  readonly selectedTimeId: TimePointId;
  /** Small signal for consumers that read the latest snapshot imperatively. */
  readonly revision: number;
  /** Changes only when a layer control or runtime projection changes. */
  readonly layerRevision: number;
  /** Null means a global change, for example selected time or reset. */
  readonly lastChangedLayerId: LayerId | null;
};

type LayerUpdater = (current: LayerState) => LayerState;

const createInitialSnapshot = (
  definitions: readonly LayerDefinition[],
): LayerStoreSnapshot => {
  const byId = {} as Record<LayerId, LayerState>;

  for (const { id } of definitions) {
    byId[id] = {
      version: 0,
      enabled: false,
      opacity: 0.72,
      requestGeneration: 0,
      status: "disabled",
      data: undefined,
      errorMessage: undefined,
    };
  }

  return {
    byId,
    selectedTimeId: DEFAULT_TIME_POINT_ID,
    revision: 0,
    layerRevision: 0,
    lastChangedLayerId: null,
  };
};

export type LayerStore = {
  readonly vedro: Vedro<LayerStoreSnapshot>;
  readonly getSnapshot: () => LayerStoreSnapshot;
  readonly subscribe: (listener: () => void) => () => void;
  readonly setEnabled: (id: LayerId, enabled: boolean) => void;
  readonly retry: (id: LayerId) => void;
  readonly setOpacity: (id: LayerId, opacity: number) => void;
  readonly setSelectedTime: (timeId: TimePointId) => void;
  readonly setRuntime: (
    id: LayerId,
    generation: number,
    runtime: LayerRuntimeState,
  ) => void;
  readonly reset: () => void;
};

export const createLayerStore = (
  definitions: readonly LayerDefinition[],
): LayerStore => {
  const vedro = new Vedro(
    "layer-store",
    createInitialSnapshot(definitions),
  );

  const updateLayer = (id: LayerId, updater: LayerUpdater): void => {
    const snapshot = vedro.get();
    const current = snapshot.byId[id];

    if (current === undefined) {
      return;
    }

    const updated = updater(current);

    if (updated === current) {
      return;
    }

    const next: LayerState = {
      ...updated,
      version: current.version + 1,
    };

    vedro.dispatch({
      byId: {
        ...snapshot.byId,
        [id]: next,
      },
      revision: snapshot.revision + 1,
      layerRevision: snapshot.layerRevision + 1,
      lastChangedLayerId: id,
    });
  };

  return {
    vedro,
    getSnapshot: (): LayerStoreSnapshot => vedro.get(),
    subscribe: (listener: () => void): (() => void) => {
      let isInitialNotification = true;

      return vedro.on("@state", () => {
        if (isInitialNotification) {
          isInitialNotification = false;
          return;
        }

        listener();
      });
    },
    setEnabled: (id: LayerId, enabled: boolean): void => {
      updateLayer(id, (current) => {
        if (current.enabled === enabled) {
          return current;
        }

        return {
          ...current,
          enabled,
          requestGeneration: current.requestGeneration + 1,
          status: enabled ? "loading" : "disabled",
          data: undefined,
          errorMessage: undefined,
        };
      });
    },
    retry: (id: LayerId): void => {
      updateLayer(id, (current) => ({
        ...current,
        enabled: true,
        requestGeneration: current.requestGeneration + 1,
        status: "loading",
        data: undefined,
        errorMessage: undefined,
      }));
    },
    setOpacity: (id: LayerId, opacity: number): void => {
      const safeOpacity = Math.min(1, Math.max(0, opacity));

      updateLayer(id, (current) =>
        current.opacity === safeOpacity
          ? current
          : {
              ...current,
              opacity: safeOpacity,
            },
      );
    },
    setSelectedTime: (timeId: TimePointId): void => {
      if (!isTimePointId(timeId)) {
        throw new Error(`Unknown time point: ${timeId}`);
      }

      if (vedro.get().selectedTimeId === timeId) {
        return;
      }

      vedro.dispatch({
        selectedTimeId: timeId,
        revision: vedro.get().revision + 1,
        lastChangedLayerId: null,
      });
    },
    setRuntime: (id: LayerId, generation: number, runtime: LayerRuntimeState): void => {
      updateLayer(id, (current) => {
        if (current.requestGeneration !== generation) {
          return current;
        }

        if (
          current.status === runtime.status
          && current.data === runtime.data
          && current.errorMessage === runtime.errorMessage
        ) {
          return current;
        }

        return {
          ...current,
          ...runtime,
        };
      });
    },
    reset: (): void => {
      vedro.dispatch(createInitialSnapshot(definitions));
    },
  };
};

// The UI uses one shared store sized for the configured stress ceiling. The
// rendered definitions remain dynamic, so the default view still subscribes to
// only the three domain layers while the same store supports 100+ layers.
export const layerStore = createLayerStore(
  createLayerDefinitions(500),
);
