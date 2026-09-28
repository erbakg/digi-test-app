import { lazy, Suspense } from "react";
import type { LayerDefinition } from "@/entities/layer/model/types";
import { LayerList } from "@/widgets/layer-list/LayerList";

const MapView = lazy(() =>
  import("@/widgets/map-view/MapView").then(({ MapView: view }) => ({ default: view })),
);
const LayerChart = lazy(() =>
  import("@/widgets/analytics/LayerChart").then(({ LayerChart: chart }) => ({ default: chart })),
);

export function LayersPage({
  definitions,
}: {
  readonly definitions: readonly LayerDefinition[];
}) {
  const demoError = new URLSearchParams(window.location.search).get("demoError");
  const hasDemoError = demoError !== null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">◒</span>
          <div>
            <strong>atlas / control</strong>
            <span>layer workspace</span>
          </div>
        </div>
        <div className="header-meta">
          <span className="connection-dot" />
          <span>API connected</span>
          <span className="header-divider" />
          <span>28 Sep 2026</span>
        </div>
      </header>

      <main className="dashboard-grid">
        <div className="dashboard-grid__map">
          <Suspense fallback={<div className="map-panel map-panel--loading">Загрузка GIS-модуля…</div>}>
            <MapView definitions={definitions} />
          </Suspense>
        </div>
        <aside className="dashboard-grid__sidebar">
          <LayerList definitions={definitions} />
          <Suspense fallback={<div className="chart-panel chart-panel--loading">Загрузка графика…</div>}>
            <LayerChart />
          </Suspense>
          {hasDemoError ? (
            <p className="demo-note">
              Demo mode: первый запрос слоя «{demoError}» завершится ошибкой, затем доступен retry.
            </p>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
