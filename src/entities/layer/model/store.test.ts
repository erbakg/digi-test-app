import { beforeEach, describe, expect, it } from "vitest";
import { createLayerDefinitions } from "./config";
import { createLayerStore, layerStore } from "./store";
import { toTimePointId } from "./time";
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
