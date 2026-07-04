import { Types } from 'mongoose';
import { CreateRaceTickDto } from '../repositories/race-tick.repository';
import { CreateRaceEventDto } from '../repositories/race-event.repository';

// Input data sau khi load từ DB và populate
export interface HorseInput {
  horseId: Types.ObjectId;
  jockeyId: Types.ObjectId;
  lane: number; // gateNumber từ Registration
  horseWeight: number;
  horseHeight: number;
  horseWinRate: number;
  jockeyWeight: number;
  jockeyWinRate: number;
  totalWin: number; // from HORSE
}

// Kết quả tính toán ở Bước 1
export interface ComputedStats {
  totalLoad: number;
  baseSpeed: number;
  acceleration: number;
  stamina: number;
}

// Dữ liệu đầy đủ 1 con ngựa để chạy engine
export interface HorseEngineData {
  horseId: Types.ObjectId;
  jockeyId: Types.ObjectId;
  lane: number;
  totalWin: number;
  horseWinRate: number;
  jockeyWinRate: number;
  stats: ComputedStats;
  conditionModifier: number; // output Bước 2
}

// Kết quả generate tick của 1 con ngựa
export interface GenerateTicksResult {
  ticks: CreateRaceTickDto[];
  events: CreateRaceEventDto[];
  finishTick: number;
}