import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapInstance } from "maplibre-gl";
import { getMockGeometry } from "@/entities/layer/api/mockApi";
import { useAllLayerState } from "@/entities/layer/model/hooks";
import type { LayerStoreSnapshot } from "@/entities/layer/model/store";
import type { LayerDefinition, LayerId } from "@/entities/layer/model/types";

const MAP_SOURCE_ID = (id: LayerId): string => `mock-source-${id}`;
const MAP_FILL_ID = (id: LayerId): string => `mock-fill-${id}`;
const MAP_LINE_ID = (id: LayerId): string => `mock-line-${id}`;

type MapViewProps = {
  readonly definitions: readonly LayerDefinition[];
};

const syncMapLayers = (
  map: MapInstance,
  definitions: readonly LayerDefinition[],
  snapshot: LayerStoreSnapshot,
): void => {
    for (const definition of definitions) {
      const layerState = snapshot.byId[definition.id];
    const isVisible = layerState?.enabled ?? false;
    const visibility = isVisible ? 1 : 0;
    const opacity = layerState?.opacity ?? 0.72;

    if (map.getLayer(MAP_FILL_ID(definition.id)) !== undefined) {
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
  const latestStateRef = useRef(state);

  latestStateRef.current = state;

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
          data: getMockGeometry(definition.id),
        });
        map.addLayer({
          id: MAP_FILL_ID(definition.id),
          type: "fill",
          source: MAP_SOURCE_ID(definition.id),
          paint: {
            "fill-color": definition.mapColor,
            "fill-opacity": 0,
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
          },
        });
      }

      mapReadyRef.current = true;
      syncMapLayers(map, definitions, latestStateRef.current);
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

    syncMapLayers(map, definitions, state);
  }, [definitions, state]);

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
        Контуры включённых слоёв отображаются поверх базовой карты.
      </p>
    </section>
  );
}
