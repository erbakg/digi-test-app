import Vedro from "vedro";
import { createLayerDefinitions } from "./config";
import type { LayerDefinition, LayerId, LayerState } from "./types";

export type LayerStoreSnapshot = {
  readonly byId: Readonly<Record<LayerId, LayerState>>;
};

type LayerUpdater = (current: LayerState) => LayerState;

const createInitialSnapshot = (
  definitions: readonly LayerDefinition[],
): LayerStoreSnapshot => {
  const byId = {} as Record<LayerId, LayerState>;

  for (const { id } of definitions) {
    byId[id] = {
      enabled: false,
      opacity: 0.72,
      requestGeneration: 0,
    };
  }

  return { byId };
};

export type LayerStore = {
  readonly vedro: Vedro<LayerStoreSnapshot>;
  readonly getSnapshot: () => LayerStoreSnapshot;
  readonly subscribe: (listener: () => void) => () => void;
  readonly setEnabled: (id: LayerId, enabled: boolean) => void;
  readonly retry: (id: LayerId) => void;
  readonly setOpacity: (id: LayerId, opacity: number) => void;
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

    const next = updater(current);

    if (next === current) {
      return;
    }

    vedro.dispatch({
      byId: {
        ...snapshot.byId,
        [id]: next,
      },
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
        };
      });
    },
    retry: (id: LayerId): void => {
      updateLayer(id, (current) => ({
        ...current,
        enabled: true,
        requestGeneration: current.requestGeneration + 1,
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
    reset: (): void => {
      vedro.dispatch({ byId: createInitialSnapshot(definitions).byId });
    },
  };
};

// The UI uses one shared store sized for the configured stress ceiling. The
// rendered definitions remain dynamic, so the default view still subscribes to
// only the three domain layers while the same store supports 100+ layers.
export const layerStore = createLayerStore(
  createLayerDefinitions(500),
);
