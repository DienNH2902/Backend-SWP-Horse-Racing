import { Types } from 'mongoose';
import { CreateRaceTickDto } from '../repositories/race-tick.repository';
import { CreateRaceEventDto } from '../repositories/race-event.repository';
import { RaceEventType } from '../schemas/race-event.schema';

// ─── Bước 4: Detect overtake + lead_change (pass thứ 2) ──────────────────────
export function detectOvertakeAndLead(
  raceId: Types.ObjectId,
  horseIds: Types.ObjectId[],
  allTicks: CreateRaceTickDto[],
  finishTickMap: Record<string, number>,
): CreateRaceEventDto[] {
  const events: CreateRaceEventDto[] = [];

  // Build progressMap[horseId][tickNumber] = progress
  // Dùng string key cho horseId để tương thích với plain object
  const progressMap = new Map<string, Map<number, number>>();

  for (const tick of allTicks) {
    const hKey = tick.horseId.toString();
    if (!progressMap.has(hKey)) {
      progressMap.set(hKey, new Map());
    }
    progressMap.get(hKey)!.set(tick.tickNumber, tick.progress);
  }

  // Hàm helper: lấy progress tại tick T cho horse H
  // Nếu ngựa đã về đích trước T → progress = 1.0
  const getProgress = (horseId: Types.ObjectId, t: number): number => {
    const hKey = horseId.toString();
    const hMap = progressMap.get(hKey);
    if (!hMap) return 0;
    if (hMap.has(t)) return hMap.get(t)!;
    // Tick sau finishTick → đã về đích
    const finish = finishTickMap[hKey] ?? 0;
    if (t > finish) return 1.0;
    return 0;
  };

  const maxTick = Math.max(...Object.values(finishTickMap));
  let leaderPrev: string | null = null;

  for (let t = 1; t <= maxTick; t++) {
    // ── Lead change ──────────────────────────────────────────────────────────
    let leaderT: string | null = null;
    let maxProgress = -1;

    for (const hId of horseIds) {
      const p = getProgress(hId, t);
      if (p > maxProgress) {
        maxProgress = p;
        leaderT = hId.toString();
      }
    }

    if (leaderT && leaderT !== leaderPrev && leaderPrev !== null) {
      events.push({
        raceId,
        tickNumber: t,
        eventType: RaceEventType.LEAD_CHANGE,
        primaryHorseId: new Types.ObjectId(leaderT),
        secondaryHorseId: null,
      });
    }
    leaderPrev = leaderT;

    // ── Overtake — check mọi cặp (A, B) ────────────────────────────────────
    for (let i = 0; i < horseIds.length; i++) {
      for (let j = i + 1; j < horseIds.length; j++) {
        const A = horseIds[i];
        const B = horseIds[j];

        const aPrev = getProgress(A, t - 1);
        const bPrev = getProgress(B, t - 1);
        const aCurr = getProgress(A, t);
        const bCurr = getProgress(B, t);

        // A vượt B
        if (aPrev < bPrev && aCurr > bCurr) {
          events.push({
            raceId,
            tickNumber: t,
            eventType: RaceEventType.OVERTAKE,
            primaryHorseId: A,
            secondaryHorseId: B,
          });
        }
        // B vượt A
        else if (bPrev < aPrev && bCurr > aCurr) {
          events.push({
            raceId,
            tickNumber: t,
            eventType: RaceEventType.OVERTAKE,
            primaryHorseId: B,
            secondaryHorseId: A,
          });
        }
      }
    }
  }

  return events;
}