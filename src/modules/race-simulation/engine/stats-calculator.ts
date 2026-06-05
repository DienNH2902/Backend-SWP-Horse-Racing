import { HorseInput, ComputedStats } from './engine.types';

// ─── Utility ──────────────────────────────────────────────────────────────────
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Bước 1: Tính HorseRaceStats ─────────────────────────────────────────────
export function calcHorseRaceStats(horse: HorseInput): ComputedStats {
  const { horseWeight, horseHeight, horseWinRate, jockeyWeight } = horse;

  // totalLoad
  const totalLoad = horseWeight + jockeyWeight;

  // loadPenalty
  const loadPenalty = clamp((totalLoad - 500) / 500, 0.0, 0.3);

  // baseSpeed
  const heightBonus = ((horseHeight - 150) / 100) * 0.05;
  let baseSpeed = 0.4 + horseWinRate * 0.5 - loadPenalty * 0.4 + heightBonus;
  baseSpeed = clamp(baseSpeed, 0.35, 0.92);

  // acceleration
  const horseWeightNorm = clamp((horseWeight - 400) / 200, 0.0, 1.0);
  const jockeyWeightPenalty = ((jockeyWeight - 50) / 100) * 0.15;
  let acceleration = 0.8 - horseWeightNorm * 0.4 - jockeyWeightPenalty;
  acceleration = clamp(acceleration, 0.3, 0.85);

  // stamina
  let stamina = 0.4 + horseWeightNorm * 0.4 - loadPenalty * 0.2;
  stamina = clamp(stamina, 0.3, 0.85);

  return { totalLoad, baseSpeed, acceleration, stamina };
}