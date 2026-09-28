import { AppProviders } from "@/app/providers/AppProviders";
import { createLayerDefinitions } from "@/entities/layer/model/config";
import { LayerStoreProvider } from "@/entities/layer/model/hooks";
import { createLayerStore } from "@/entities/layer/model/store";
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
  const store = useMemo(() => createLayerStore(definitions), [definitions]);

  return (
    <AppProviders>
      <LayerStoreProvider store={store}>
        <LayersPage definitions={definitions} />
      </LayerStoreProvider>
    </AppProviders>
  );
}
