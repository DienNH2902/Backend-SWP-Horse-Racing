import { Types } from 'mongoose';
import { HorseEngineData, GenerateTicksResult } from './engine.types';
import { RaceEventType } from '../schemas/race-event.schema';

//  Engine constants 
const LUCK_FACTOR = 0.3;   // giảm từ 0.8 → variance nhỏ hơn, smooth hơn
const SPEED_SCALE = 0.018;
const MIN_SPEED   = 0.003;
const MAX_SPEED   = 0.012;

// Ngưỡng detect event — nới rộng để giảm tần suất
const BURST_RATIO   = 1.8;  // tăng từ 1.4 → chỉ burst khi tăng tốc đột ngột thật sự
const STUMBLE_RATIO = 0.4;  // giảm từ 0.6 → chỉ stumble khi giảm tốc đột ngột thật sự

// Xác suất random event độc lập (không phụ thuộc speed ratio)
// Tạo thêm event đa dạng mà không phụ thuộc hoàn toàn vào variance
const BURST_CHANCE   = 0.04;  // 4% mỗi tick có thể burst
const STUMBLE_CHANCE = 0.03;  // 3% mỗi tick có thể stumble

//  Utility 
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function randomRange(range: number): number {
  return (Math.random() * 2 - 1) * range;
}

//  Phase 
type Phase = 'EARLY' | 'MID' | 'LATE';

function getPhase(progress: number): Phase {
  if (progress < 0.2) return 'EARLY';
  if (progress < 0.7) return 'MID';
  return 'LATE';
}


function calcPhaseMultiplier(
  phase: Phase,
  stats: HorseEngineData['stats'],
): number {
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

//  Generate ticks cho 1 con ngựa 
export function generateTicks(
  raceId: Types.ObjectId,
  horse: HorseEngineData,
): GenerateTicksResult {
  const { horseId, lane, stats, conditionModifier } = horse;

  const ticks: GenerateTicksResult['ticks']   = [];
  const events: GenerateTicksResult['events'] = [];

  let progress      = 0.0;
  let tick          = 0;
  let prevSpeed     = 0.0;
  let lastEventTick = -5; // cooldown: tránh 2 event liên tiếp quá gần

  while (progress < 1.0) {
    const phase           = getPhase(progress);
    const phaseMultiplier = calcPhaseMultiplier(phase, stats);

    const variance = randomRange(0.3) * LUCK_FACTOR * SPEED_SCALE;
    let tickSpeed  =
      stats.baseSpeed * phaseMultiplier * conditionModifier * SPEED_SCALE
      + variance;
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

    // ── Detect event (cooldown 5 tick giữa các event) ────────────────────────
    const cooldownOk = tick - lastEventTick >= 5;

    if (tick > 0 && prevSpeed > 0 && cooldownOk) {
      const ratio = tickSpeed / prevSpeed;
      let eventFired = false;

      // 1. Detect từ speed ratio (đột biến thực sự)
      if (ratio > BURST_RATIO) {
        events.push({
          raceId,
          tickNumber: tick,
          eventType: RaceEventType.BURST,
          primaryHorseId: horseId,
          secondaryHorseId: null,
        });
        eventFired = true;
      } else if (ratio < STUMBLE_RATIO) {
        events.push({
          raceId,
          tickNumber: tick,
          eventType: RaceEventType.STUMBLE,
          primaryHorseId: horseId,
          secondaryHorseId: null,
        });
        eventFired = true;
      }

      // 2. Random event độc lập (nếu chưa có event tick này)
      if (!eventFired) {
        const roll = Math.random();
        if (roll < BURST_CHANCE) {
          // Burst ngẫu nhiên: boost speed tick này
          tickSpeed = clamp(tickSpeed * 1.3, MIN_SPEED, MAX_SPEED);
          events.push({
            raceId,
            tickNumber: tick,
            eventType: RaceEventType.BURST,
            primaryHorseId: horseId,
            secondaryHorseId: null,
          });
          eventFired = true;
        } else if (roll < BURST_CHANCE + STUMBLE_CHANCE) {
          // Stumble ngẫu nhiên: giảm speed tick này
          tickSpeed = clamp(tickSpeed * 0.6, MIN_SPEED, MAX_SPEED);
          events.push({
            raceId,
            tickNumber: tick,
            eventType: RaceEventType.STUMBLE,
            primaryHorseId: horseId,
            secondaryHorseId: null,
          });
          eventFired = true;
        }
      }

      if (eventFired) lastEventTick = tick;
    }

    prevSpeed = tickSpeed;
    tick++;
  }

  return { ticks, events, finishTick: tick - 1 };
}