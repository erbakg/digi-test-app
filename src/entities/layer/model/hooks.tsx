import { createVedro } from "vedro";
import { useSyncExternalStore, type PropsWithChildren } from "react";
import { layerStore } from "./store";
import type { LayerStoreSnapshot } from "./store";
import type { TimePointId } from "./time";
import type { LayerId, LayerState } from "./types";

const layerVedro = createVedro(layerStore.vedro);

export function LayerStoreProvider({ children }: PropsWithChildren) {
  return <layerVedro.Provider>{children}</layerVedro.Provider>;
}

export function useLayerStore() {
  return layerStore;
}

export function useLayerState(id: LayerId): LayerState {
  const layer = useSyncExternalStore(
    layerStore.subscribe,
    () => layerStore.getSnapshot().byId[id],
    () => layerStore.getSnapshot().byId[id],
  );

  if (layer === undefined) {
    throw new Error(`Unknown layer: ${id}`);
  }

  return layer;
}

export type LayerStoreSignal = Pick<LayerStoreSnapshot, "revision" | "lastChangedLayerId">;

export function useLayerStoreSignal(): LayerStoreSignal {
  return layerVedro.useSelector((snapshot) => ({
    revision: snapshot.revision,
    lastChangedLayerId: snapshot.lastChangedLayerId,
  }));
}

export function useSelectedTime(): TimePointId {
  return layerVedro.useSelector((snapshot) => snapshot.selectedTimeId);
}
