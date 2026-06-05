import { Types } from 'mongoose';
import { HorseEngineData, GenerateTicksResult } from './engine.types';
import { RaceEventType } from '../schemas/race-event.schema';

const LUCK_FACTOR = 0.4;
const MIN_SPEED = 0.005;
const MAX_SPEED = 0.05;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// random trong khoảng [-range, +range]
function randomRange(range: number): number {
  return (Math.random() * 2 - 1) * range;
}

// ─── Phase multiplier ─────────────────────────────────────────────────────────
type Phase = 'EARLY' | 'MID' | 'LATE';

function getPhase(progress: number): Phase {
  if (progress < 0.2)  return 'EARLY';
  if (progress < 0.7)  return 'MID';
  return 'LATE';
}

function calcPhaseMultiplier(phase: Phase, stats: HorseEngineData['stats']): number {
  switch (phase) {
    case 'EARLY':
      return 0.6 + stats.acceleration * 0.5;
    case 'MID':
      return 1.0;
    case 'LATE': {
      const staminaPenalty = (1 - stats.stamina) * 0.35;
      return 1.0 - staminaPenalty;
    }
  }
}

// ─── Bước 3: Generate ticks cho 1 con ngựa ────────────────────────────────────
export function generateTicks(
  raceId: Types.ObjectId,
  horse: HorseEngineData,
): GenerateTicksResult {
  const { horseId, jockeyId, lane, stats, conditionModifier } = horse;

  const ticks: GenerateTicksResult['ticks'] = [];
  const events: GenerateTicksResult['events'] = [];

  let progress = 0.0;
  let tick = 0;
  let prevSpeed = 0.0;

  while (progress < 1.0) {
    const phase = getPhase(progress);
    const phaseMultiplier = calcPhaseMultiplier(phase, stats);

    // Variance: random(-0.3, +0.3) × LUCK_FACTOR → ±0.12
    const randomVariance = randomRange(0.3) * LUCK_FACTOR;

    let tickSpeed =
      stats.baseSpeed * phaseMultiplier * conditionModifier + randomVariance;
    tickSpeed = clamp(tickSpeed, MIN_SPEED, MAX_SPEED);

    progress = Math.min(progress + tickSpeed, 1.0);

    ticks.push({
      raceId,
      horseId,
      tickNumber: tick,
      progress,
      currentSpeed: tickSpeed,
      lane,
    });

    // Detect stumble / burst (so sánh với tick trước)
    if (tick > 0 && prevSpeed > 0) {
      const ratio = tickSpeed / prevSpeed;

      if (ratio > 1.4) {
        events.push({
          raceId,
          tickNumber: tick,
          eventType: RaceEventType.BURST,
          primaryHorseId: horseId,
          secondaryHorseId: null,
        });
      } else if (ratio < 0.6) {
        events.push({
          raceId,
          tickNumber: tick,
          eventType: RaceEventType.STUMBLE,
          primaryHorseId: horseId,
          secondaryHorseId: null,
        });
      }
    }

    prevSpeed = tickSpeed;
    tick++;
  }

  return { ticks, events, finishTick: tick - 1 };
}