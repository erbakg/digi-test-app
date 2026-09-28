import { useQueries } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLayerDataRevision, useLayerStore } from "@/entities/layer/model/hooks";
import { layerQueryOptions } from "@/entities/layer/model/queries";
import type { LayerDefinition, LayerStatus } from "@/entities/layer/model/types";

type LayerDataSyncProps = {
  readonly definitions: readonly LayerDefinition[];
};

const getQueryStatus = (
  enabled: boolean,
  isPending: boolean,
  isFetching: boolean,
  isError: boolean,
  isSuccess: boolean,
): LayerStatus => {
  if (!enabled) {
    return "disabled";
  }

  if (isError) {
    return "error";
  }

  if (isPending || isFetching) {
    return "loading";
  }

  return isSuccess ? "success" : "loading";
};

export function LayerDataSync({ definitions }: LayerDataSyncProps) {
  const store = useLayerStore();
  const layerRevision = useLayerDataRevision();
  const snapshot = store.getSnapshot();
  const queries = useQueries({
    queries: definitions.map((definition) => {
      const layerState = snapshot.byId[definition.id];

      if (layerState === undefined) {
        throw new Error(`Unknown layer: ${definition.id}`);
      }

      return layerQueryOptions(definition.id, layerState);
    }),
  });

  useEffect(() => {
    definitions.forEach((definition, index) => {
      const layerState = snapshot.byId[definition.id];
      const query = queries[index];

      if (layerState === undefined || query === undefined) {
        return;
      }

      const status = getQueryStatus(
        layerState.enabled,
        query.isPending,
        query.isFetching,
        query.isError,
        query.isSuccess,
      );
      const errorMessage = query.error instanceof Error
        ? query.error.message
        : query.error === null || query.error === undefined
          ? undefined
          : "Неизвестная ошибка запроса";

      store.setRuntime(definition.id, layerState.requestGeneration, {
        status,
        data: query.data,
        errorMessage,
      });
    });
  }, [definitions, queries, layerRevision, store]);

  return null;
}
