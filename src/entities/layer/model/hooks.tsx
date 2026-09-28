import { createVedro } from "vedro";
import { type PropsWithChildren } from "react";
import { layerStore } from "./store";
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
  const layerVersion = layerVedro.useSelector(
    (snapshot) => snapshot.byId[id]?.version,
  );
  const layer = layerStore.getSnapshot().byId[id];

  if (layer === undefined || layerVersion === undefined) {
    throw new Error(`Unknown layer: ${id}`);
  }

  return layer;
}

export function useLayerStoreRevision(): number {
  return layerVedro.useSelector((snapshot) => snapshot.revision);
}

export function useLayerDataRevision(): number {
  return layerVedro.useSelector((snapshot) => snapshot.layerRevision);
}

export function useSelectedTime(): TimePointId {
  return layerVedro.useSelector((snapshot) => snapshot.selectedTimeId);
}
