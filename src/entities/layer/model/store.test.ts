import { beforeEach, describe, expect, it } from "vitest";
import { createLayerDefinitions } from "./config";
import { createLayerStore, layerStore } from "./store";
import { DEFAULT_TIME_POINT_ID, toTimePointId } from "./time";
import { toLayerId } from "./types";

describe("layerStore", () => {
  beforeEach(() => layerStore.reset());

  it("updates only the requested layer and preserves its opacity", () => {
    const before = layerStore.getSnapshot();
    const temperatureId = toLayerId("temperature");
    const windId = toLayerId("wind");

    layerStore.setOpacity(temperatureId, 0.35);
    layerStore.setEnabled(temperatureId, true);

    const after = layerStore.getSnapshot();

    expect(after.byId[temperatureId]?.enabled).toBe(true);
    expect(after.byId[temperatureId]?.opacity).toBe(0.35);
    expect(after.byId[windId]).toBe(before.byId[windId]);
  });

  it("increments the request generation for retry", () => {
    const windId = toLayerId("wind");
    const initialGeneration = layerStore.getSnapshot().byId[windId]?.requestGeneration;

    layerStore.retry(windId);

    expect(layerStore.getSnapshot().byId[windId]?.requestGeneration).toBe(initialGeneration! + 1);
    expect(layerStore.getSnapshot().byId[windId]?.enabled).toBe(true);
  });

  it("ignores runtime updates from an obsolete request generation", () => {
    const temperatureId = toLayerId("temperature");

    layerStore.setEnabled(temperatureId, true);
    const firstGeneration = layerStore.getSnapshot().byId[temperatureId]?.requestGeneration;
    layerStore.retry(temperatureId);
    const latestGeneration = layerStore.getSnapshot().byId[temperatureId]?.requestGeneration;

    if (firstGeneration === undefined || latestGeneration === undefined) {
      throw new Error("Layer generation was not initialized");
    }

    layerStore.setRuntime(temperatureId, firstGeneration, {
      status: "success",
      data: undefined,
      errorMessage: undefined,
    });

    expect(layerStore.getSnapshot().byId[temperatureId]?.requestGeneration).toBe(latestGeneration);
    expect(layerStore.getSnapshot().byId[temperatureId]?.status).toBe("loading");

    layerStore.setRuntime(temperatureId, latestGeneration, {
      status: "success",
      data: undefined,
      errorMessage: undefined,
    });

    expect(layerStore.getSnapshot().byId[temperatureId]?.status).toBe("success");
  });

  it("applies multiple runtime projections in one immutable update", () => {
    const definitions = createLayerDefinitions(3);
    const stressStore = createLayerStore(definitions);
    const temperatureId = definitions[0]?.id;
    const windId = definitions[1]?.id;
    const staleId = definitions[2]?.id;

    if (temperatureId === undefined || windId === undefined || staleId === undefined) {
      throw new Error("Test definitions were not initialized");
    }

    stressStore.setEnabled(temperatureId, true);
    stressStore.setEnabled(windId, true);
    stressStore.setEnabled(staleId, true);
    const staleGeneration = stressStore.getSnapshot().byId[staleId]?.requestGeneration;
    stressStore.retry(staleId);
    const temperatureGeneration = stressStore.getSnapshot().byId[temperatureId]?.requestGeneration;
    const windGeneration = stressStore.getSnapshot().byId[windId]?.requestGeneration;

    if (
      temperatureGeneration === undefined
      || windGeneration === undefined
      || staleGeneration === undefined
    ) {
      throw new Error("Test generations were not initialized");
    }

    let notificationCount = 0;
    const unsubscribe = stressStore.subscribe(() => {
      notificationCount += 1;
    });

    stressStore.setRuntimeMany([
      {
        id: temperatureId,
        generation: temperatureGeneration,
        runtime: { status: "success", data: undefined, errorMessage: undefined },
      },
      {
        id: windId,
        generation: windGeneration,
        runtime: { status: "success", data: undefined, errorMessage: undefined },
      },
      {
        id: staleId,
        generation: staleGeneration,
        runtime: { status: "success", data: undefined, errorMessage: undefined },
      },
    ]);
    unsubscribe();

    expect(notificationCount).toBe(1);
    expect(stressStore.getSnapshot().byId[temperatureId]?.status).toBe("success");
    expect(stressStore.getSnapshot().byId[windId]?.status).toBe("success");
    expect(stressStore.getSnapshot().byId[staleId]?.status).toBe("loading");
    expect(stressStore.getSnapshot().lastChangedLayerId).toBe(null);
  });

  it("clamps opacity to the valid range", () => {
    const insolationId = toLayerId("insolation");
    layerStore.setOpacity(insolationId, 4);
    expect(layerStore.getSnapshot().byId[insolationId]?.opacity).toBe(1);

    layerStore.setOpacity(insolationId, -2);
    expect(layerStore.getSnapshot().byId[insolationId]?.opacity).toBe(0);
  });

  it("keeps the selected time in the Vedro application state", () => {
    const noon = toTimePointId("12:00");

    layerStore.setSelectedTime(noon);

    expect(layerStore.getSnapshot().selectedTimeId).toBe(noon);
  });

  it("rejects an unknown runtime time point", () => {
    expect(() => layerStore.setSelectedTime(toTimePointId("25:00"))).toThrow(
      "Unknown time point: 25:00",
    );
  });

  it("resets selected time together with layer state", () => {
    layerStore.setSelectedTime(toTimePointId("14:00"));
    layerStore.setEnabled(toLayerId("temperature"), true);

    layerStore.reset();

    expect(layerStore.getSnapshot().selectedTimeId).toBe(DEFAULT_TIME_POINT_ID);
    expect(layerStore.getSnapshot().byId[toLayerId("temperature")]?.enabled).toBe(false);
  });

  it("keeps 120 layer records manageable for bulk updates", () => {
    for (const requestedCount of [5, 25, 100, 120]) {
      expect(createLayerDefinitions(requestedCount)).toHaveLength(requestedCount);
    }

    const definitions = createLayerDefinitions(120);
    const stressStore = createLayerStore(definitions);
    let notificationCount = 0;
    const startedAt = performance.now();

    const unsubscribe = stressStore.subscribe(() => {
      notificationCount += 1;
    });

    for (const definition of definitions) {
      stressStore.setEnabled(definition.id, true);
    }

    const elapsedMs = performance.now() - startedAt;
    unsubscribe();

    expect(definitions).toHaveLength(120);
    expect(Object.keys(stressStore.getSnapshot().byId)).toHaveLength(120);
    expect(notificationCount).toBe(120);
    expect(elapsedMs).toBeLessThan(1000);
    expect(stressStore.getSnapshot().byId[toLayerId("mock-117")]?.enabled).toBe(true);
  });
});
