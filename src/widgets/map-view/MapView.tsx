import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapInstance } from "maplibre-gl";
import { getMock3dObject, getMockGeometry } from "@/entities/layer/api/mockApi";
import { useAllLayerState } from "@/entities/layer/model/hooks";
import { layerQueryOptions } from "@/entities/layer/model/queries";
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

type LayerDataById = ReadonlyMap<LayerId, LayerData>;

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
  dataById: LayerDataById,
): void => {
  for (const definition of definitions) {
    const layerState = snapshot.byId[definition.id];
    const layerData = dataById.get(definition.id);
    const selectedPoint = getLayerDataPoint(layerData, snapshot.selectedTimeId);
    const isVisible = layerState?.enabled ?? false;
    const visibility = isVisible ? 1 : 0;
    const opacity = layerState?.opacity ?? 0.72;
    const source = map.getSource(MAP_SOURCE_ID(definition.id)) as GeoJSONSource | undefined;

    if (source !== undefined) {
      source.setData(selectedPoint?.geometry ?? getMockGeometry(definition.id, snapshot.selectedTimeId));
    }

    if (map.getLayer(MAP_FILL_ID(definition.id)) !== undefined) {
      map.setPaintProperty(
        MAP_FILL_ID(definition.id),
        "fill-color",
        getDataColor(definition, getIntensity(layerData, snapshot.selectedTimeId)),
      );
      map.setPaintProperty(MAP_FILL_ID(definition.id), "fill-opacity", visibility * opacity * 0.6);
    }
    if (map.getLayer(MAP_LINE_ID(definition.id)) !== undefined) {
      map.setPaintProperty(MAP_LINE_ID(definition.id), "line-opacity", visibility * opacity);
    }
  }
};

export function MapView({ definitions }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const mapReadyRef = useRef(false);
  const state = useAllLayerState();
  const layerQueries = useQueries({
    queries: definitions.map((definition) => {
      const layerState = state.byId[definition.id];

      if (layerState === undefined) {
        throw new Error(`Unknown layer: ${definition.id}`);
      }

      return layerQueryOptions(definition.id, layerState);
    }),
  });
  const dataById = useMemo(() => {
    const nextDataById = new Map<LayerId, LayerData>();

    definitions.forEach((definition, index) => {
      const data = layerQueries[index]?.data;

      if (data !== undefined) {
        nextDataById.set(definition.id, data);
      }
    });

    return nextDataById;
  }, [definitions, layerQueries]);
  const latestStateRef = useRef({ state, dataById });

  latestStateRef.current = { state, dataById };

  useEffect(() => {
    if (mapContainerRef.current === null) {
      return undefined;
    }

    const map = new maplibregl.Map({
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

    map.on("load", () => {
      for (const definition of definitions) {
        map.addSource(MAP_SOURCE_ID(definition.id), {
          type: "geojson",
          data: getMockGeometry(definition.id, latestStateRef.current.state.selectedTimeId),
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
      syncMapLayers(
        map,
        definitions,
        latestStateRef.current.state,
        latestStateRef.current.dataById,
      );
    });

    return () => {
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [definitions]);

  useEffect(() => {
    const map = mapRef.current;

    if (map === null || !mapReadyRef.current) {
      return;
    }

    syncMapLayers(map, definitions, state, dataById);
  }, [definitions, state, dataById]);

  return (
    <section className="map-panel" aria-label="Карта с активными слоями">
      <div className="map-panel__topline">
        <div>
          <span className="eyebrow eyebrow--light">GIS preview</span>
          <h2>Слои на карте</h2>
        </div>
        <span className="map-panel__live"><span /> mock data</span>
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
