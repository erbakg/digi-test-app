import { AppProviders } from "@/app/providers/AppProviders";
import { createLayerDefinitions } from "@/entities/layer/model/config";
import { LayerStoreProvider } from "@/entities/layer/model/hooks";
import { LayersPage } from "@/pages/layers-page/LayersPage";
import { useMemo } from "react";

const getRequestedLayerCount = (): number => {
  const value = Number(new URLSearchParams(window.location.search).get("layers"));
  return Number.isFinite(value) && value > 0 ? value : 3;
};

export function App() {
  const requestedLayerCount = getRequestedLayerCount();
  const definitions = useMemo(
    () => createLayerDefinitions(requestedLayerCount),
    [requestedLayerCount],
  );

  return (
    <AppProviders>
      <LayerStoreProvider>
        <LayersPage definitions={definitions} />
      </LayerStoreProvider>
    </AppProviders>
  );
}
