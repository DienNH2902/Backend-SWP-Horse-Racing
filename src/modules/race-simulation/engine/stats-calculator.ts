import { HorseInput, ComputedStats } from './engine.types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calcHorseRaceStats(horse: HorseInput): ComputedStats {
  // ── Guard: ép kiểu + fallback để tránh NaN ───────────────────────────────
  const horseWeight  = Number(horse.horseWeight)  || 0;
  const jockeyWeight = Number(horse.jockeyWeight) || 0;
  const horseWinRate = Number(horse.horseWinRate) || 0;

  // horse.height đang lưu đơn vị mét (1.75) → convert sang cm
  const rawHeight   = Number(horse.horseHeight) || 0;
  const horseHeight = rawHeight < 10 ? rawHeight * 100 : rawHeight;

  // winRate trong Horse schema lưu 0-100 → normalize về 0-1
  const winRateNorm = horseWinRate > 1 ? horseWinRate / 100 : horseWinRate;

  // ── totalLoad + loadPenalty ───────────────────────────────────────────────
  const totalLoad  = horseWeight + jockeyWeight;
  const loadPenalty = clamp((totalLoad - 500) / 500, 0.0, 0.3);

  // ── baseSpeed ─────────────────────────────────────────────────────────────
  const heightBonus = ((horseHeight - 150) / 100) * 0.05;
  let baseSpeed = 0.4 + winRateNorm * 0.5 - loadPenalty * 0.4 + heightBonus;
  baseSpeed = clamp(baseSpeed, 0.35, 0.92);

  // ── acceleration ──────────────────────────────────────────────────────────
  const horseWeightNorm    = clamp((horseWeight - 400) / 200, 0.0, 1.0);
  const jockeyWeightPenalty = ((jockeyWeight - 50) / 100) * 0.15;
  let acceleration = 0.8 - horseWeightNorm * 0.4 - jockeyWeightPenalty;
  acceleration = clamp(acceleration, 0.3, 0.85);

  // ── stamina ───────────────────────────────────────────────────────────────
  let stamina = 0.4 + horseWeightNorm * 0.4 - loadPenalty * 0.2;
  stamina = clamp(stamina, 0.3, 0.85);

  return { totalLoad, baseSpeed, acceleration, stamina };
}