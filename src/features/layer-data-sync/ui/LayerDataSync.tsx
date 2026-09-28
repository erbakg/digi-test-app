import { useQuery } from "@tanstack/react-query";
import { memo, useEffect, useMemo } from "react";
import { useLayerState } from "@/entities/layer/model/hooks";
import { layerQueryOptions } from "@/entities/layer/model/queries";
import type { LayerRuntimeUpdate } from "@/entities/layer/model/store";
import { layerStore } from "@/entities/layer/model/store";
import type { LayerDefinition, LayerStatus } from "@/entities/layer/model/types";

type LayerDataSyncProps = {
  readonly definitions: readonly LayerDefinition[];
};

type LayerRuntimeProjectionProps = {
  readonly definition: LayerDefinition;
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

const pendingRuntimeUpdates = new Map<string, LayerRuntimeUpdate>();
let isRuntimeFlushScheduled = false;

const enqueueRuntimeUpdate = (update: LayerRuntimeUpdate): void => {
  pendingRuntimeUpdates.set(update.id, update);

  if (isRuntimeFlushScheduled) {
    return;
  }

  isRuntimeFlushScheduled = true;
  queueMicrotask(() => {
    isRuntimeFlushScheduled = false;
    const updates = [...pendingRuntimeUpdates.values()];
    pendingRuntimeUpdates.clear();
    layerStore.setRuntimeMany(updates);
  });
};

const LayerRuntimeProjection = memo(function LayerRuntimeProjection({
  definition,
}: LayerRuntimeProjectionProps) {
  const state = useLayerState(definition.id);
  const queryOptions = useMemo(
    () => layerQueryOptions(definition.id, {
      enabled: state.enabled,
      requestGeneration: state.requestGeneration,
    }),
    [definition.id, state.enabled, state.requestGeneration],
  );
  const query = useQuery(queryOptions);
  const status = getQueryStatus(
    state.enabled,
    query.isPending,
    query.isFetching,
    query.isError,
    query.isSuccess,
  );
  const queryErrorMessage = query.error instanceof Error
    ? query.error.message
    : query.error === null || query.error === undefined
      ? undefined
      : "Неизвестная ошибка запроса";
  const data = state.enabled ? query.data : undefined;
  const errorMessage = state.enabled ? queryErrorMessage : undefined;

  useEffect(() => {
    enqueueRuntimeUpdate({
      id: definition.id,
      generation: state.requestGeneration,
      runtime: { status, data, errorMessage },
    });
  }, [data, definition.id, errorMessage, state.requestGeneration, status]);

  return null;
});

export function LayerDataSync({ definitions }: LayerDataSyncProps) {
  return (
    <>
      {definitions.map((definition) => (
        <LayerRuntimeProjection key={definition.id} definition={definition} />
      ))}
    </>
  );
}
