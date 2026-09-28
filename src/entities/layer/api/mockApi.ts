import type { GeoJsonFeatureCollection } from "@/shared/types/geo";
import { toLayerId, type LayerData, type LayerId } from "../model/types";

export class MockApiError extends Error {
  override readonly name = "MockApiError";

  constructor(message: string) {
    super(message);
  }
}

const CORE_DELAY: Readonly<Record<string, number>> = {
  temperature: 520,
  wind: 760,
  insolation: 420,
};

const hashLayerId = (id: LayerId): number => {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) % 997;
  }

  return hash;
};

export const getMockGeometry = (id: LayerId): GeoJsonFeatureCollection => {
  const hash = hashLayerId(id);
  const longitude = 69.25 + (hash % 12) * 0.055;
  const latitude = 42.63 + (Math.floor(hash / 12) % 7) * 0.055;
  const width = 0.16 + (hash % 4) * 0.025;
  const height = 0.11 + (hash % 3) * 0.02;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { intensity: 0.35 + (hash % 50) / 100 },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [longitude, latitude],
            [longitude + width, latitude],
            [longitude + width, latitude + height],
            [longitude, latitude + height],
            [longitude, latitude],
          ]],
        },
      },
    ],
  };
};

const getDemoErrorLayer = (): LayerId | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const value = new URLSearchParams(window.location.search).get("demoError");
  return value === null ? null : toLayerId(value);
};

const shouldFailOnce = (id: LayerId): boolean => {
  if (getDemoErrorLayer() !== id || typeof window === "undefined") {
    return false;
  }

  const storageKey = `map-layer-demo-error:${id}`;

  if (window.sessionStorage.getItem(storageKey) === "1") {
    return false;
  }

  window.sessionStorage.setItem(storageKey, "1");
  return true;
};

const waitForResponse = (delay: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const onAbort = (): void => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("The request was aborted", "AbortError"));
    };

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delay);

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });

export async function fetchLayerData(
  id: LayerId,
  signal: AbortSignal,
): Promise<LayerData> {
  const delay = CORE_DELAY[id] ?? 240 + (hashLayerId(id) % 260);
  await waitForResponse(delay, signal);

  if (shouldFailOnce(id)) {
    throw new MockApiError(
      `Mock API не вернул данные слоя «${id}». Попробуйте ещё раз.`,
    );
  }

  const isTemperature = id === toLayerId("temperature");
  const isWind = id === toLayerId("wind");

  return {
    layerId: id,
    value: isTemperature ? 18 : isWind ? 6.4 : 45 + (hashLayerId(id) % 45),
    unit: isTemperature ? "°C" : isWind ? "м/с" : "%",
    loadedAt: new Date().toISOString(),
    geometry: getMockGeometry(id),
  };
}
