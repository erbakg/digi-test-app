export type TimePointId = string & { readonly __timePointId: unique symbol };

export type TimePoint = {
  readonly id: TimePointId;
  readonly label: string;
  readonly minutes: number;
};

export const toTimePointId = (value: string): TimePointId => value as TimePointId;

export const TIME_POINTS = [
  { id: toTimePointId("10:00"), label: "10:00", minutes: 10 * 60 },
  { id: toTimePointId("11:00"), label: "11:00", minutes: 11 * 60 },
  { id: toTimePointId("12:00"), label: "12:00", minutes: 12 * 60 },
  { id: toTimePointId("13:00"), label: "13:00", minutes: 13 * 60 },
  { id: toTimePointId("14:00"), label: "14:00", minutes: 14 * 60 },
] as const satisfies readonly [TimePoint, ...TimePoint[]];

export const DEFAULT_TIME_POINT_ID: TimePointId = TIME_POINTS[0].id;

export const isTimePointId = (value: string): value is TimePointId =>
  TIME_POINTS.some((timePoint) => timePoint.id === value);

export const getTimePoint = (id: TimePointId): TimePoint => {
  const timePoint = TIME_POINTS.find((item) => item.id === id);

  if (timePoint === undefined) {
    throw new Error(`Unknown time point: ${id}`);
  }

  return timePoint;
};
