import type { GeoJsonFeatureCollection } from "@/shared/types/geo";
import {
  DEFAULT_TIME_POINT_ID,
  TIME_POINTS,
  type TimePointId,
} from "../model/time";
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

export const getMockGeometry = (
  id: LayerId,
  timeId: TimePointId = DEFAULT_TIME_POINT_ID,
  intensity = 0.5,
): GeoJsonFeatureCollection => {
  const hash = hashLayerId(id);
  const timeIndex = Math.max(0, TIME_POINTS.findIndex((point) => point.id === timeId));
  const drift = Math.sin((hash + timeIndex * 17) / 4) * 0.012;
  const longitude = 69.25 + (hash % 12) * 0.055 + drift;
  const latitude = 42.63 + (Math.floor(hash / 12) % 7) * 0.055 + drift;
  const width = 0.16 + (hash % 4) * 0.025 + intensity * 0.04;
  const height = 0.11 + (hash % 3) * 0.02 + intensity * 0.03;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          intensity,
          time: timeId,
        },
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

export const getMock3dObject = (): GeoJsonFeatureCollection => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { height: 42, name: "weather-station" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [69.58, 42.82],
          [69.605, 42.82],
          [69.605, 42.845],
          [69.58, 42.845],
          [69.58, 42.82],
        ]],
      },
    },
  ],
});

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

const getLayerUnit = (id: LayerId): string => {
  const isTemperature = id === toLayerId("temperature");
  const isWind = id === toLayerId("wind");

  return isTemperature ? "°C" : isWind ? "м/с" : "%";
};

const getLayerValue = (id: LayerId, timeIndex: number): number => {
  const hash = hashLayerId(id);
  const wave = Math.sin((hash + timeIndex * 1.35) / 5);
  const isTemperature = id === toLayerId("temperature");
  const isWind = id === toLayerId("wind");

  if (isTemperature) {
    return Number((18 + wave * 4.5 + timeIndex * 0.35).toFixed(1));
  }

  if (isWind) {
    return Number((6.4 + wave * 2.2 + timeIndex * 0.15).toFixed(1));
  }

  return Math.round(58 + wave * 20 + timeIndex * 4 + (hash % 15));
};

const normalizeValue = (id: LayerId, value: number): number => {
  const isTemperature = id === toLayerId("temperature");
  const isWind = id === toLayerId("wind");

  if (isTemperature) {
    return Math.min(1, Math.max(0, (value - 10) / 20));
  }

  if (isWind) {
    return Math.min(1, Math.max(0, value / 12));
  }

  return Math.min(1, Math.max(0, value / 100));
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

  const unit = getLayerUnit(id);
  const series = TIME_POINTS.map((timePoint, timeIndex) => {
    const value = getLayerValue(id, timeIndex);

    return {
      timeId: timePoint.id,
      value,
      unit,
      geometry: getMockGeometry(id, timePoint.id, normalizeValue(id, value)),
    };
  });

  return {
    layerId: id,
    loadedAt: new Date().toISOString(),
    series,
  };
}
