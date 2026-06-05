type Weather = 'sunny' | 'cloudy' | 'rainy';
type TrackType = 'dirt' | 'turf' | 'synthetic';
type TrackCondition = 'dry' | 'wet' | 'muddy';

// trackType × trackCondition → base modifier
const TRACK_MODIFIER_TABLE: Record<TrackType, Record<TrackCondition, number>> =
  {
    dirt:      { dry: 1.0, wet: 0.9,  muddy: 0.78 },
    turf:      { dry: 1.0, wet: 0.93, muddy: 0.85 },
    synthetic: { dry: 1.0, wet: 0.97, muddy: 0.93 },
  };

const WEATHER_MODIFIER: Record<Weather, number> = {
  sunny:  1.0,
  cloudy: 0.97,
  rainy:  0.88,
};

function calcWindModifier(windSpeed: number): number {
  if (windSpeed <= 5)  return 1.0;
  if (windSpeed <= 10) return 0.97;
  return 0.94;
}

function calcTrackModifier(
  trackType: TrackType,
  trackCondition: TrackCondition,
  horseWeight: number,
): number {
  const base = TRACK_MODIFIER_TABLE[trackType]?.[trackCondition] ?? 1.0;

  // Riêng muddy: trừ thêm weightBonus
  if (trackCondition === 'muddy') {
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
  const weatherMod = WEATHER_MODIFIER[condition.weather as Weather] ?? 1.0;
  const windMod = calcWindModifier(condition.windSpeed);
  const trackMod = calcTrackModifier(
    raceCourse.trackType as TrackType,
    condition.trackCondition as TrackCondition,
    horseWeight,
  );

  return weatherMod * trackMod * windMod;
}