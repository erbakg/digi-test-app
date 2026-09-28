import { fetchLayerData } from "../api/mockApi";
import { useLayerState } from "./hooks";
import type { LayerId } from "./types";

export type LayerQueryState = {
  readonly enabled: boolean;
  readonly requestGeneration: number;
};

export const layerQueryKey = (id: LayerId, generation: number) =>
  ["map-layer", id, generation] as const;

export const layerQueryOptions = (id: LayerId, state: LayerQueryState) => ({
  queryKey: layerQueryKey(id, state.requestGeneration),
  queryFn: ({ signal }: { readonly signal: AbortSignal }) => fetchLayerData(id, signal),
  enabled: state.enabled,
  retry: false,
  staleTime: Infinity,
  gcTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export function useLayerRuntime(id: LayerId) {
  const state = useLayerState(id);

  return {
    state,
    data: state.data,
    errorMessage: state.errorMessage,
    status: state.status,
  };
}
