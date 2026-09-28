import { useMemo, type CSSProperties } from "react";
import { TIME_POINTS } from "@/entities/layer/model/time";
import { useLayerStore, useSelectedTime } from "@/entities/layer/model/hooks";

export function Timeline() {
  const store = useLayerStore();
  const selectedTimeId = useSelectedTime();
  const selectedIndex = useMemo(
    () => Math.max(0, TIME_POINTS.findIndex((point) => point.id === selectedTimeId)),
    [selectedTimeId],
  );
  const progress = TIME_POINTS.length > 1
    ? `${(selectedIndex / (TIME_POINTS.length - 1)) * 100}%`
    : "0%";

  const handleTimeChange = (nextIndex: number): void => {
    const nextPoint = TIME_POINTS[nextIndex];

    if (nextPoint !== undefined) {
      store.setSelectedTime(nextPoint.id);
    }
  };

  return (
    <section className="timeline-panel" aria-labelledby="timeline-heading">
      <div className="timeline-panel__header">
        <div>
          <span className="eyebrow">Temporal control</span>
          <h2 id="timeline-heading">Временная шкала</h2>
        </div>
        <span className="timeline-panel__selected">{TIME_POINTS[selectedIndex]?.label}</span>
      </div>
      <input
        className="timeline-slider"
        type="range"
        min="0"
        max={TIME_POINTS.length - 1}
        step="1"
        value={selectedIndex}
        onChange={(event) => handleTimeChange(Number(event.target.value))}
        style={{ "--timeline-progress": progress } as CSSProperties}
        aria-label="Выбранное время данных"
        data-testid="timeline-slider"
      />
      <div className="timeline-points" role="list" aria-label="Временные точки">
        {TIME_POINTS.map((point, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              key={point.id}
              type="button"
              className={`timeline-point${isSelected ? " timeline-point--selected" : ""}`}
              onClick={() => handleTimeChange(index)}
              aria-pressed={isSelected}
              data-testid={`timeline-point-${point.label}`}
            >
              <span className="timeline-point__dot" />
              <span>{point.label}</span>
            </button>
          );
        })}
      </div>
      <p className="timeline-panel__hint">
        Карта и график показывают данные выбранного времени.
      </p>
    </section>
  );
}
