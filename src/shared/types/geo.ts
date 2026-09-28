export type Coordinates = [longitude: number, latitude: number];

export type PolygonGeometry = {
  readonly type: "Polygon";
  readonly coordinates: Coordinates[][];
};

export type GeoJsonFeature = {
  readonly type: "Feature";
  readonly properties: Record<string, string | number>;
  readonly geometry: PolygonGeometry;
};

export type GeoJsonFeatureCollection = {
  readonly type: "FeatureCollection";
  readonly features: GeoJsonFeature[];
};
