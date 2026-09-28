import { toLayerId, type LayerDefinition, type LayerId } from "./types";

export const LAYER_DEFINITIONS: readonly LayerDefinition[] = [
  {
    id: toLayerId("temperature"),
    title: "Температура",
    description: "Прогноз температуры на карте",
    unit: "°C",
    icon: "☀",
    accent: "#ff8f70",
    chartColor: "#ff9a76",
    mapColor: "#ef6b5c",
  },
  {
    id: toLayerId("wind"),
    title: "Ветер",
    description: "Направление и скорость ветра",
    unit: "м/с",
    icon: "↗",
    accent: "#62b9ff",
    chartColor: "#62b9ff",
    mapColor: "#338bd1",
  },
  {
    id: toLayerId("insolation"),
    title: "Инсоляция",
    description: "Интенсивность солнечного излучения",
    unit: "%",
    icon: "◌",
    accent: "#f4c85b",
    chartColor: "#f4c85b",
    mapColor: "#d7952e",
  },
];

const STRESS_COLORS = [
  ["#8c7cf6", "#6655d6"],
  ["#51c3b1", "#2c9685"],
  ["#ef8eaa", "#d15c7b"],
  ["#e9b95d", "#c58b2d"],
] as const;

export const createLayerDefinitions = (requestedCount: number): readonly LayerDefinition[] => {
  const count = Math.min(500, Math.max(LAYER_DEFINITIONS.length, Math.floor(requestedCount)));

  if (count === LAYER_DEFINITIONS.length) {
    return LAYER_DEFINITIONS;
  }

  const syntheticLayers = Array.from(
    { length: count - LAYER_DEFINITIONS.length },
    (_, index): LayerDefinition => {
      const ordinal = index + 1;
      const [accent, mapColor] = STRESS_COLORS[index % STRESS_COLORS.length] ?? STRESS_COLORS[0];

      return {
        id: toLayerId(`mock-${ordinal}`),
        title: `Синтетический слой ${String(ordinal).padStart(3, "0")}`,
        description: "Генерируемый слой для stress-теста",
        unit: "%",
        icon: "◫",
        accent,
        chartColor: accent,
        mapColor,
      };
    },
  );

  return [...LAYER_DEFINITIONS, ...syntheticLayers];
};

export const getLayerDefinition = (id: LayerId): LayerDefinition => {
  const definition = LAYER_DEFINITIONS.find((item) => item.id === id);

  if (definition === undefined) {
    throw new Error(`Unknown layer: ${id}`);
  }

  return definition;
};
