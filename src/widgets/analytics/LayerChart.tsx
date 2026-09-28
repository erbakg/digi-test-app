import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getLayerDefinition } from "@/entities/layer/model/config";
import { useLayerStore, useSelectedTime } from "@/entities/layer/model/hooks";
import { useLayerRuntime } from "@/entities/layer/model/queries";
import { getLayerDataPoint, toLayerId } from "@/entities/layer/model/types";
import { getTimePoint, TIME_POINTS } from "@/entities/layer/model/time";

type ChartRow = {
  readonly timeId: string;
  readonly label: string;
  readonly temperature?: number;
  readonly wind?: number;
  readonly insolation?: number;
};

const temperatureDefinition = getLayerDefinition(toLayerId("temperature"));
const windDefinition = getLayerDefinition(toLayerId("wind"));
const insolationDefinition = getLayerDefinition(toLayerId("insolation"));

export function LayerChart() {
  const store = useLayerStore();
  const selectedTimeId = useSelectedTime();
  const temperatureRuntime = useLayerRuntime(temperatureDefinition.id);
  const windRuntime = useLayerRuntime(windDefinition.id);
  const insolationRuntime = useLayerRuntime(insolationDefinition.id);
  const runtimes = [temperatureRuntime, windRuntime, insolationRuntime];
  const hasData = runtimes.some(({ data }) => data !== undefined);
  const isLoading = runtimes.some(({ status }) => status === "loading");
  const selectedTime = getTimePoint(selectedTimeId);

  const chartData: readonly ChartRow[] = TIME_POINTS.map((timePoint) => ({
    timeId: timePoint.id,
    label: timePoint.label,
    temperature: getLayerDataPoint(temperatureRuntime.data, timePoint.id)?.value,
    wind: getLayerDataPoint(windRuntime.data, timePoint.id)?.value,
    insolation: getLayerDataPoint(insolationRuntime.data, timePoint.id)?.value,
  }));

  const handleChartClick = (chartState: { readonly activeLabel?: unknown } | undefined): void => {
    const activeLabel = chartState?.activeLabel;

    if (typeof activeLabel !== "string") {
      return;
    }

    const nextTimePoint = TIME_POINTS.find((timePoint) => timePoint.label === activeLabel);

    if (nextTimePoint !== undefined) {
      store.setSelectedTime(nextTimePoint.id);
    }
  };

  return (
    <section className="chart-panel" aria-labelledby="chart-heading">
      <div className="chart-panel__header">
        <div>
          <span className="eyebrow">Recharts widget</span>
          <h2 id="chart-heading">Временной ряд</h2>
        </div>
        <span className="chart-panel__period" data-testid="chart-selected-time">
          {selectedTime.label}
        </span>
      </div>
      <div className="chart-panel__body">
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7edf5" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#667085", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#98a2b3", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine x={selectedTime.label} stroke="#7589ff" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="temperature"
                name={temperatureDefinition.title}
                stroke={temperatureDefinition.chartColor}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="wind"
                name={windDefinition.title}
                stroke={windDefinition.chartColor}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="insolation"
                name={insolationDefinition.title}
                stroke={insolationDefinition.chartColor}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-panel__empty">
            {isLoading ? "Загрузка временного ряда…" : "Включите слой, чтобы увидеть данные."}
          </div>
        )}
      </div>
      <p className="chart-panel__hint">
        Клик по точке на графике переключает timeline и состояние карты.
      </p>
    </section>
  );
}
