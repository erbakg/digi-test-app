import { memo, type ChangeEvent, type CSSProperties } from "react";
import { useLayerStore } from "../model/hooks";
import { useLayerQuery } from "../model/queries";
import type { LayerDefinition } from "../model/types";
import { StatusPill } from "./StatusPill";

type LayerCardProps = {
  readonly definition: LayerDefinition;
};

const formatLoadedAt = (value: string | undefined): string => {
  if (value === undefined) {
    return "данные ещё не загружались";
  }

  return `обновлено в ${new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value))}`;
};

export const LayerCard = memo(function LayerCard({ definition }: LayerCardProps) {
  const store = useLayerStore();
  const { state, data, error, status } = useLayerQuery(definition.id);
  const isLoading = status === "loading";
  const hasError = status === "error";
  const hasData = data !== undefined;
  const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка запроса";
  const metadata = hasData ? formatLoadedAt(data.loadedAt) : "ожидание запроса";

  const handleOpacityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    store.setOpacity(definition.id, Number(event.target.value) / 100);
  };

  return (
    <article
      className={`layer-card layer-card--${status}`}
      data-testid={`layer-card-${definition.id}`}
      style={{ "--layer-accent": definition.accent } as CSSProperties}
      aria-busy={isLoading}
    >
      <div className="layer-card__heading">
        <div className="layer-card__identity">
          <span className="layer-card__icon" aria-hidden="true">
            {definition.icon}
          </span>
          <div>
            <h2>{definition.title}</h2>
            <p>{definition.description}</p>
          </div>
        </div>
        <StatusPill status={status} testId={`layer-status-${definition.id}`} />
      </div>

      <label className="switch-row">
        <span>Показывать на карте</span>
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={state.enabled}
          onClick={() => store.setEnabled(definition.id, !state.enabled)}
          data-testid={`layer-toggle-${definition.id}`}
          aria-label={`Включить слой «${definition.title}»`}
        />
      </label>

      <div className="opacity-row">
        <div className="opacity-row__labels">
          <label htmlFor={`opacity-${definition.id}`}>Прозрачность</label>
          <output htmlFor={`opacity-${definition.id}`}>
            {Math.round(state.opacity * 100)}%
          </output>
        </div>
        <input
          id={`opacity-${definition.id}`}
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(state.opacity * 100)}
          onChange={handleOpacityChange}
          style={
            {
              "--range-accent": definition.accent,
              "--range-value": `${Math.round(state.opacity * 100)}%`,
            } as CSSProperties
          }
          data-testid={`layer-opacity-${definition.id}`}
          aria-label={`Прозрачность слоя «${definition.title}»`}
        />
      </div>

      <div className="layer-card__footer">
        <span className="layer-card__meta">
          {metadata}
        </span>
        {hasError ? (
          <button
            className="retry-button"
            type="button"
            onClick={() => store.retry(definition.id)}
            data-testid={`layer-retry-${definition.id}`}
          >
            Повторить
          </button>
        ) : null}
      </div>

      {hasError ? (
        <p className="layer-card__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </article>
  );
});
