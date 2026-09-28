import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapInstance } from "maplibre-gl";
import { getMock3dObject, getMockGeometry } from "@/entities/layer/api/mockApi";
import { useLayerStore, useLayerStoreSignal } from "@/entities/layer/model/hooks";
import { getLayerDataPoint, type LayerData, type LayerDefinition, type LayerId } from "@/entities/layer/model/types";
import type { LayerStoreSnapshot } from "@/entities/layer/model/store";

const MAP_SOURCE_ID = (id: LayerId): string => `mock-source-${id}`;
const MAP_FILL_ID = (id: LayerId): string => `mock-fill-${id}`;
const MAP_LINE_ID = (id: LayerId): string => `mock-line-${id}`;
const THREE_D_SOURCE_ID = "mock-3d-weather-station";
const THREE_D_LAYER_ID = "mock-3d-weather-station-extrusion";
const THREE_D_OUTLINE_ID = "mock-3d-weather-station-outline";

type MapViewProps = {
  readonly definitions: readonly LayerDefinition[];
};

type MapRuntimeState = {
  readonly ready: boolean;
  readonly error: boolean;
  readonly sourceCount: number;
  readonly layerCount: number;
  readonly has3dLayer: boolean;
};

const INITIAL_MAP_RUNTIME_STATE: MapRuntimeState = {
  ready: false,
  error: false,
  sourceCount: 0,
  layerCount: 0,
  has3dLayer: false,
};

const getIntensity = (data: LayerData | undefined, timeId: LayerStoreSnapshot["selectedTimeId"]): number => {
  const point = getLayerDataPoint(data, timeId);
  const intensity = point?.geometry.features[0]?.properties.intensity;

  return typeof intensity === "number" ? intensity : 0.5;
};

const getDataColor = (definition: LayerDefinition, intensity: number): string => {
  if (intensity >= 0.66) {
    return "#ef6b5c";
  }

  if (intensity <= 0.33) {
    return "#4d8ddd";
  }

  return definition.mapColor;
};

const syncMapLayers = (
  map: MapInstance,
  definitions: readonly LayerDefinition[],
  snapshot: LayerStoreSnapshot,
  previousSnapshot: LayerStoreSnapshot | undefined,
  changedLayerId: LayerId | null,
): void => {
  const isInitialSync = previousSnapshot === undefined;
  const timeChanged = isInitialSync || previousSnapshot.selectedTimeId !== snapshot.selectedTimeId;
  const revisionsSincePrevious = isInitialSync
    ? 0
    : snapshot.revision - previousSnapshot.revision;
  const hasMultipleUpdates = revisionsSincePrevious > 1;
  const shouldSyncAll = isInitialSync
    || timeChanged
    || changedLayerId === null
    || hasMultipleUpdates;
  const layersToSync = shouldSyncAll
    ? definitions
    : definitions.filter((definition) => definition.id === changedLayerId);

  for (const definition of layersToSync) {
    const layerState = snapshot.byId[definition.id];
    const previousLayerState = previousSnapshot?.byId[definition.id];

    if (layerState === undefined) {
      continue;
    }

    const layerChanged = isInitialSync || previousLayerState !== layerState;
    const dataChanged = isInitialSync || previousLayerState?.data !== layerState.data;

    if (!layerChanged && !timeChanged) {
      continue;
    }

    const selectedPoint = getLayerDataPoint(layerState.data, snapshot.selectedTimeId);
    const isVisible = layerState.enabled;
    const visibility = isVisible ? 1 : 0;
    const opacity = layerState.opacity;
    const source = map.getSource(MAP_SOURCE_ID(definition.id)) as GeoJSONSource | undefined;
    const hasFillLayer = map.getLayer(MAP_FILL_ID(definition.id)) !== undefined;
    const hasLineLayer = map.getLayer(MAP_LINE_ID(definition.id)) !== undefined;
    const shouldUpdateData = timeChanged || dataChanged;
    const shouldUpdateColor = layerChanged || timeChanged;

    if (source !== undefined && shouldUpdateData) {
      source.setData(selectedPoint?.geometry ?? getMockGeometry(definition.id, snapshot.selectedTimeId));
    }

    if (hasFillLayer && shouldUpdateColor) {
      map.setPaintProperty(
        MAP_FILL_ID(definition.id),
        "fill-color",
        getDataColor(definition, getIntensity(layerState.data, snapshot.selectedTimeId)),
      );
    }
    if (hasFillLayer && layerChanged) {
      map.setPaintProperty(MAP_FILL_ID(definition.id), "fill-opacity", visibility * opacity * 0.6);
    }
    if (hasLineLayer && layerChanged) {
      map.setPaintProperty(MAP_LINE_ID(definition.id), "line-opacity", visibility * opacity);
    }
  }
};

export function MapView({ definitions }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const mapReadyRef = useRef(false);
  const [mapRuntime, setMapRuntime] = useState<MapRuntimeState>(INITIAL_MAP_RUNTIME_STATE);
  const store = useLayerStore();
  const { revision, lastChangedLayerId } = useLayerStoreSignal();
  const state = store.getSnapshot();
  const latestStateRef = useRef(state);
  const previousStateRef = useRef<LayerStoreSnapshot | undefined>(undefined);

  latestStateRef.current = state;

  useEffect(() => {
    if (mapContainerRef.current === null) {
      return undefined;
    }

    let isDisposed = false;
    let hasMapError = false;
    setMapRuntime(INITIAL_MAP_RUNTIME_STATE);

    void import("maplibre-gl").then((maplibre) => {
      if (isDisposed || mapContainerRef.current === null) {
        return;
      }

      const map = new maplibre.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [69.63, 42.87],
        zoom: 9.4,
      });

      mapRef.current = map;
      previousStateRef.current = undefined;

      map.on("error", (event) => {
        if (isDisposed || mapReadyRef.current) {
          return;
        }

        const sourceId = "sourceId" in event && typeof event.sourceId === "string"
          ? event.sourceId
          : undefined;

        if (sourceId === "osm") {
          return;
        }

        hasMapError = true;
        setMapRuntime((current) => ({
          ...current,
          ready: false,
          error: true,
        }));
      });

      map.on("load", () => {
        if (isDisposed || hasMapError) {
          return;
        }

        for (const definition of definitions) {
          map.addSource(MAP_SOURCE_ID(definition.id), {
            type: "geojson",
            data: getMockGeometry(definition.id, latestStateRef.current.selectedTimeId),
          });
          map.addLayer({
            id: MAP_FILL_ID(definition.id),
            type: "fill",
            source: MAP_SOURCE_ID(definition.id),
            paint: {
              "fill-color": definition.mapColor,
              "fill-opacity": 0,
              "fill-color-transition": { duration: 320 },
              "fill-opacity-transition": { duration: 320 },
            },
          });
          map.addLayer({
            id: MAP_LINE_ID(definition.id),
            type: "line",
            source: MAP_SOURCE_ID(definition.id),
            paint: {
              "line-color": definition.mapColor,
              "line-width": 2,
              "line-opacity": 0,
              "line-color-transition": { duration: 320 },
              "line-opacity-transition": { duration: 320 },
            },
          });
        }

        map.addSource(THREE_D_SOURCE_ID, {
          type: "geojson",
          data: getMock3dObject(),
        });
        map.addLayer({
          id: THREE_D_LAYER_ID,
          type: "fill-extrusion",
          source: THREE_D_SOURCE_ID,
          minzoom: 8,
          paint: {
            "fill-extrusion-color": "#f4c85b",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.82,
          },
        });
        map.addLayer({
          id: THREE_D_OUTLINE_ID,
          type: "line",
          source: THREE_D_SOURCE_ID,
          paint: {
            "line-color": "#fff2bb",
            "line-width": 2,
          },
        });

        mapReadyRef.current = true;
        syncMapLayers(map, definitions, latestStateRef.current, undefined, null);
        previousStateRef.current = latestStateRef.current;
        const sourceCount = definitions.reduce(
          (count, definition) => count + (map.getSource(MAP_SOURCE_ID(definition.id)) !== undefined ? 1 : 0),
          0,
        ) + (map.getSource(THREE_D_SOURCE_ID) !== undefined ? 1 : 0);
        const layerCount = definitions.reduce(
          (count, definition) => count
            + (map.getLayer(MAP_FILL_ID(definition.id)) !== undefined ? 1 : 0)
            + (map.getLayer(MAP_LINE_ID(definition.id)) !== undefined ? 1 : 0),
          0,
        )
          + (map.getLayer(THREE_D_LAYER_ID) !== undefined ? 1 : 0)
          + (map.getLayer(THREE_D_OUTLINE_ID) !== undefined ? 1 : 0);

        setMapRuntime({
          ready: true,
          error: false,
          sourceCount,
          layerCount,
          has3dLayer: map.getLayer(THREE_D_LAYER_ID) !== undefined,
        });
      });
    }).catch(() => {
      if (!isDisposed) {
        setMapRuntime({ ...INITIAL_MAP_RUNTIME_STATE, error: true });
      }
    });

    return () => {
      isDisposed = true;
      mapReadyRef.current = false;
      previousStateRef.current = undefined;
      setMapRuntime(INITIAL_MAP_RUNTIME_STATE);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [definitions]);

  useEffect(() => {
    const map = mapRef.current;

    if (map === null || !mapReadyRef.current) {
      return;
    }

    syncMapLayers(map, definitions, state, previousStateRef.current, lastChangedLayerId);
    previousStateRef.current = state;
  }, [definitions, revision]);

  return (
    <section className="map-panel" aria-label="Карта с активными слоями">
      <div className="map-panel__topline">
        <div>
          <span className="eyebrow eyebrow--light">GIS preview</span>
          <h2>Слои на карте</h2>
        </div>
        <span
          className="map-panel__live"
          data-testid="map-status"
          data-ready={mapRuntime.ready ? "true" : "false"}
          data-error={mapRuntime.error ? "true" : "false"}
          data-source-count={mapRuntime.sourceCount}
          data-layer-count={mapRuntime.layerCount}
          data-has-3d-layer={mapRuntime.has3dLayer ? "true" : "false"}
        >
          <span aria-hidden="true" />
          {mapRuntime.error ? "map error" : mapRuntime.ready ? "map ready" : "loading map"}
        </span>
      </div>
      <div className="map-panel__canvas" ref={mapContainerRef} />
      <p className="map-panel__hint">
        Контуры меняются по выбранному времени; золотая 3D-вышка — дополнительный объект.
      </p>
      <span className="map-panel__3d-badge" data-testid="map-3d-weather-station">
        3D weather station
      </span>
    </section>
  );
}
