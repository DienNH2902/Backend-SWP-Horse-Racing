import { WeatherEnum, TrackConditionEnum } from '../../race/race-condition/schemas/race-condition.schema';
import { TrackTypeEnum } from '../../race/race-course/schemas/race-course.schema';


const WEATHER_MODIFIER: Record<WeatherEnum, number> = {
  [WeatherEnum.SUNNY]:  1.00,
  [WeatherEnum.CLOUDY]: 0.97,
  [WeatherEnum.RAINY]:  0.88,
  [WeatherEnum.WINDY]:  0.95,
};

const TRACK_MODIFIER_TABLE: Record<TrackTypeEnum, Record<TrackConditionEnum, number>> = {
  [TrackTypeEnum.DIRT]: {
    [TrackConditionEnum.GOOD]:  1.00,
    [TrackConditionEnum.SOFT]:  0.90,
    [TrackConditionEnum.HEAVY]: 0.83,
    [TrackConditionEnum.MUDDY]: 0.78,
  },
  [TrackTypeEnum.TURF]: {
    [TrackConditionEnum.GOOD]:  1.00,
    [TrackConditionEnum.SOFT]:  0.93,
    [TrackConditionEnum.HEAVY]: 0.88,
    [TrackConditionEnum.MUDDY]: 0.85,
  },
  [TrackTypeEnum.SYNTHETIC]: {
    [TrackConditionEnum.GOOD]:  1.00,
    [TrackConditionEnum.SOFT]:  0.97,
    [TrackConditionEnum.HEAVY]: 0.95,
    [TrackConditionEnum.MUDDY]: 0.93,
  },
};

function calcWindModifier(windSpeed: number): number {
  if (windSpeed <= 5)  return 1.00;
  if (windSpeed <= 10) return 0.97;
  return 0.94;
}

function calcTrackModifier(
  trackType: TrackTypeEnum,
  trackCondition: TrackConditionEnum,
  horseWeight: number,
): number {
  const base = TRACK_MODIFIER_TABLE[trackType]?.[trackCondition] ?? 1.0;

  //ngựa nặng đi bùn tốt hơn
  if (trackCondition === TrackConditionEnum.MUDDY) {
    const weightBonus = (horseWeight / 1000) * 0.1;
    return base - weightBonus;
  }

  return base;
}

export interface RaceConditionInput {
  weather: string;
  trackCondition: string;
  windSpeed: number;
}

export interface RaceCourseInput {
  trackType: string;
}

export function calcConditionModifier(
  condition: RaceConditionInput,
  raceCourse: RaceCourseInput,
  horseWeight: number,
): number {
  const weatherMod = WEATHER_MODIFIER[condition.weather as WeatherEnum] ?? 1.0;
  const windMod    = calcWindModifier(condition.windSpeed);
  const trackMod   = calcTrackModifier(
    raceCourse.trackType as TrackTypeEnum,
    condition.trackCondition as TrackConditionEnum,
    horseWeight,
  );

  return weatherMod * trackMod * windMod;
}