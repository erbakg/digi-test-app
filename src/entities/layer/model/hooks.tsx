import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { layerStore, type LayerStore } from "./store";
import type { LayerId, LayerState } from "./types";

const LayerStoreContext = createContext<LayerStore>(layerStore);

export function LayerStoreProvider({
  store,
  children,
}: PropsWithChildren<{ readonly store: LayerStore }>) {
  return <LayerStoreContext.Provider value={store}>{children}</LayerStoreContext.Provider>;
}

export function useLayerStore(): LayerStore {
  return useContext(LayerStoreContext);
}

export function useLayerState(id: LayerId): LayerState {
  const store = useLayerStore();
  const getLayerSnapshot = useCallback(() => {
    const layer = store.getSnapshot().byId[id];

    if (layer === undefined) {
      throw new Error(`Unknown layer: ${id}`);
    }

    return layer;
  }, [id, store]);

  return useSyncExternalStore(
    store.subscribe,
    getLayerSnapshot,
    getLayerSnapshot,
  );
}

export function useAllLayerState() {
  const store = useLayerStore();

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
