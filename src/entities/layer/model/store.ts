import { LAYER_DEFINITIONS } from "./config";
import type { LayerDefinition, LayerId, LayerState } from "./types";

export type LayerStoreSnapshot = {
  readonly byId: Readonly<Record<LayerId, LayerState>>;
};

type Listener = () => void;
type LayerUpdater = (current: LayerState) => LayerState;

const createInitialSnapshot = (definitions: readonly LayerDefinition[]): LayerStoreSnapshot => {
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
  readonly getSnapshot: () => LayerStoreSnapshot;
  readonly subscribe: (listener: Listener) => () => void;
  readonly setEnabled: (id: LayerId, enabled: boolean) => void;
  readonly retry: (id: LayerId) => void;
  readonly setOpacity: (id: LayerId, opacity: number) => void;
  readonly reset: () => void;
};

export const createLayerStore = (definitions: readonly LayerDefinition[]): LayerStore => {
  let snapshot = createInitialSnapshot(definitions);
  const listeners = new Set<Listener>();

  const updateLayer = (id: LayerId, updater: LayerUpdater): void => {
    const current = snapshot.byId[id];

    if (current === undefined) {
      return;
    }

    const next = updater(current);

    if (next === current) {
      return;
    }

    snapshot = {
      byId: {
        ...snapshot.byId,
        [id]: next,
      },
    };

    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getSnapshot: (): LayerStoreSnapshot => snapshot,
    subscribe: (listener: Listener): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
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
      snapshot = createInitialSnapshot(definitions);
      for (const listener of listeners) {
        listener();
      }
    },
  };
};

export const layerStore = createLayerStore(LAYER_DEFINITIONS);
