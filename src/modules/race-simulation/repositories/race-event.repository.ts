import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { RaceEvent, RaceEventType } from '../schemas/race-event.schema';

export interface CreateRaceEventDto {
  raceId: Types.ObjectId;
  tickNumber: number;
  eventType: RaceEventType;
  primaryHorseId: Types.ObjectId;
  secondaryHorseId?: Types.ObjectId | null;
}

@Injectable()
export class RaceEventRepository {
  constructor(
    @InjectModel(RaceEvent.name)
    private readonly raceEventModel: Model<RaceEvent>,
  ) {}

  async bulkInsert(events: CreateRaceEventDto[], session?: ClientSession): Promise<void> {
    if (events.length === 0) return;
    await this.raceEventModel.insertMany(events, { ordered: false, session });
  }

  async findByRaceId(raceId: string): Promise<RaceEvent[]> {
    return await this.raceEventModel
      .find({ raceId: new Types.ObjectId(raceId) })
      .sort({ tickNumber: 1 })
      .lean()
      .exec();
  }

    async deleteByRaceId(raceId: string): Promise<void> {
    await this.raceEventModel
      .deleteMany({ raceId: new Types.ObjectId(raceId) })
      .exec();
  }
}