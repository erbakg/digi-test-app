import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LAYER_DEFINITIONS } from "@/entities/layer/model/config";

const chartData = LAYER_DEFINITIONS.map((layer) => ({
  name: layer.title,
  value: layer.id === "temperature" ? 18 : layer.id === "wind" ? 6.4 : 74,
  fill: layer.chartColor,
}));

export function LayerChart() {
  return (
    <section className="chart-panel" aria-labelledby="chart-heading">
      <div className="chart-panel__header">
        <div>
          <span className="eyebrow">Recharts widget</span>
          <h2 id="chart-heading">Текущие значения</h2>
        </div>
        <span className="chart-panel__period">mock / now</span>
      </div>
      <div className="chart-panel__body">
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7edf5" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#667085", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#98a2b3", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#f5f8fb" }} />
            <Bar dataKey="value" radius={[5, 5, 0, 0]}>
              {chartData.map((item) => (
                <Cell key={item.name} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
