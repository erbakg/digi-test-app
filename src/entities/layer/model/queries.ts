import { useQuery } from "@tanstack/react-query";
import { fetchLayerData, MockApiError } from "../api/mockApi";
import { useLayerState } from "./hooks";
import type { LayerData, LayerId, LayerState, LayerStatus } from "./types";

export const layerQueryKey = (id: LayerId, generation: number) =>
  ["map-layer", id, generation] as const;

export const layerQueryOptions = (id: LayerId, state: LayerState) => ({
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

export function useLayerQuery(id: LayerId) {
  const state = useLayerState(id);
  const query = useQuery<LayerData, MockApiError>(layerQueryOptions(id, state));

  const status: LayerStatus = !state.enabled
    ? "disabled"
    : query.isError
      ? "error"
      : query.isPending || query.isFetching
        ? "loading"
        : query.isSuccess
          ? "success"
          : "loading";

  return {
    state,
    data: query.data,
    error: query.error,
    status,
  };
}
