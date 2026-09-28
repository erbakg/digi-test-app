import { memo, type ChangeEvent, type CSSProperties } from "react";
import { useLayerStore, useSelectedTime } from "../model/hooks";
import { useLayerRuntime } from "../model/queries";
import { getLayerDataPoint, type LayerDefinition } from "../model/types";
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
  const selectedTimeId = useSelectedTime();
  const { state, data, errorMessage: queryErrorMessage, status } = useLayerRuntime(definition.id);
  const isLoading = status === "loading";
  const hasError = status === "error";
  const hasData = data !== undefined;
  const errorMessage = queryErrorMessage ?? "Неизвестная ошибка запроса";
  const metadata = hasData ? formatLoadedAt(data.loadedAt) : "ожидание запроса";
  const selectedPoint = getLayerDataPoint(data, selectedTimeId);
  const hasSelectedPoint = selectedPoint !== undefined;
  const selectedValue = hasSelectedPoint
    ? `${selectedPoint.value} ${selectedPoint.unit}`
    : "нет данных";

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
          aria-label={`${state.enabled ? "Выключить" : "Включить"} слой «${definition.title}»`}
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
        <div>
          <strong className="layer-card__value" data-testid={`layer-value-${definition.id}`}>
            {selectedValue}
          </strong>
          <span className="layer-card__meta">{metadata}</span>
        </div>
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
