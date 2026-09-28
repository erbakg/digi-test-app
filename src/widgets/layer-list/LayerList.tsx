import { LayerCard } from "@/entities/layer/ui/LayerCard";
import type { LayerDefinition } from "@/entities/layer/model/types";

export function LayerList({ definitions }: { readonly definitions: readonly LayerDefinition[] }) {
  return (
    <section className="layer-list" aria-labelledby="layers-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Управление слоями</span>
          <h1 id="layers-heading">Карта погоды</h1>
        </div>
        <span className="layer-count">{definitions.length} слоёв</span>
      </div>
      <div className="layer-list__items">
        {definitions.map((definition) => (
          <LayerCard key={definition.id} definition={definition} />
        ))}
      </div>
    </section>
  );
}
