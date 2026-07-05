import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { RaceRepository } from '../race/race.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import { RaceScheduleItemDto } from './dto/race-schedule-item.dto';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly raceRepo: RaceRepository,
    private readonly registrationRepo: RegistrationRepository,
  ) {}

  private async toDto(race: any): Promise<RaceScheduleItemDto> {
    const totalSlots = race.tournamentId?.horsesPerRace ?? 0;
    const filledSlots = await this.registrationRepo.countConfirmedByRace(
      race._id.toString(),
    );

    return plainToInstance(
      RaceScheduleItemDto,
      {
        ...race,
        totalSlots,
        filledSlots,
        availableSlots: totalSlots - filledSlots,
      },
      { excludeExtraneousValues: true },
    );
  }

  async getUpcomingPublicSchedule(): Promise<RaceScheduleItemDto[]> {
    const races = await this.raceRepo.findUpcomingRaces();
    return Promise.all(races.map((r) => this.toDto(r)));
  }

  async getUpcomingRefereeSchedule(refereeId: string): Promise<RaceScheduleItemDto[]> {
    const races = await this.raceRepo.findUpcomingRacesByReferee(refereeId);
    return Promise.all(races.map((r) => this.toDto(r)));
  }

  async getUpcomingJockeySchedule(jockeyId: string): Promise<RaceScheduleItemDto[]> {
    const raceIds = await this.registrationRepo.findRaceIdsByJockey(jockeyId);
    if (!raceIds.length) return [];

    const races = await this.raceRepo.findUpcomingRacesByIds(raceIds);
    return Promise.all(races.map((r) => this.toDto(r)));
  }
}