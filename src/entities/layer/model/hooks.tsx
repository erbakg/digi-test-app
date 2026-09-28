import { createVedro } from "vedro";
import { type PropsWithChildren } from "react";
import { layerStore } from "./store";
import type { LayerId, LayerState } from "./types";

const layerVedro = createVedro(layerStore.vedro);

export function LayerStoreProvider({ children }: PropsWithChildren) {
  return <layerVedro.Provider>{children}</layerVedro.Provider>;
}

export function useLayerStore() {
  return layerStore;
}

export function useLayerState(id: LayerId): LayerState {
  const layer = layerVedro.useSelector((snapshot) => snapshot.byId[id]);

  if (layer === undefined) {
    throw new Error(`Unknown layer: ${id}`);
  }

  return layer;
}

export function useAllLayerState() {
  return layerVedro.useSelector((snapshot) => snapshot);
}
