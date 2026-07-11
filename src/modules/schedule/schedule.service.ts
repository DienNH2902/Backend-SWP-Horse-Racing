import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { RaceRepository } from '../race/race.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import {
  RaceScheduleItemDto,
  OwnerRaceScheduleItemDto,
  JockeyRaceScheduleItemDto,
} from './dto/race-schedule-item.dto';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly raceRepo: RaceRepository,
    private readonly registrationRepo: RegistrationRepository,
  ) {}

  private async buildBaseData(race: any): Promise<Record<string, any>> {
    const totalSlots = race.tournamentId?.horsesPerRace ?? 0;
    const filledSlots = await this.registrationRepo.countConfirmedByRace(
      race._id.toString(),
    );

    return {
      ...race,
      totalSlots,
      filledSlots,
      availableSlots: totalSlots - filledSlots,
    };
  }

  private async toDto(race: any): Promise<RaceScheduleItemDto> {
    const data = await this.buildBaseData(race);
    return plainToInstance(RaceScheduleItemDto, data, {
      excludeExtraneousValues: true,
    });
  }

  private async toOwnerDto(
    race: any,
    reg?: any,
  ): Promise<OwnerRaceScheduleItemDto> {
    const data = await this.buildBaseData(race);
    return plainToInstance(
      OwnerRaceScheduleItemDto,
      {
        ...data,
        horseId: reg?.horseId?._id?.toString(),
        horseName: reg?.horseId?.name,
        jockeyId: reg?.jockeyId?._id?.toString(),
        jockeyName: reg?.jockeyId?.fullName,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async toJockeyDto(
    race: any,
    reg?: any,
  ): Promise<JockeyRaceScheduleItemDto> {
    const data = await this.buildBaseData(race);
    return plainToInstance(
      JockeyRaceScheduleItemDto,
      {
        ...data,
        horseId: reg?.horseId?._id?.toString(),
        horseName: reg?.horseId?.name,
      },
      { excludeExtraneousValues: true },
    );
  }

  async getUpcomingPublicSchedule(): Promise<RaceScheduleItemDto[]> {
    const races = await this.raceRepo.findUpcomingRaces();
    return Promise.all(races.map((r) => this.toDto(r)));
  }

  async getUpcomingRefereeSchedule(
    refereeId: string,
  ): Promise<RaceScheduleItemDto[]> {
    const races = await this.raceRepo.findUpcomingRacesByReferee(refereeId);
    return Promise.all(races.map((r) => this.toDto(r)));
  }

  async getUpcomingJockeySchedule(
    jockeyId: string,
  ): Promise<JockeyRaceScheduleItemDto[]> {
    const raceIds = await this.registrationRepo.findRaceIdsByJockey(jockeyId);
    if (!raceIds.length) return [];

    const races = await this.raceRepo.findUpcomingRacesByIds(raceIds);
    const registrations =
      await this.registrationRepo.findConfirmedRegistrationsByJockeyAndRaces(
        jockeyId,
        raceIds,
      );
    const regByRace = new Map(
      registrations.map((r: any) => [r.raceId.toString(), r]),
    );

    return Promise.all(
      races.map((r) => this.toJockeyDto(r, regByRace.get(r._id.toString()))),
    );
  }

  async getUpcomingOwnerSchedule(
    ownerId: string,
  ): Promise<OwnerRaceScheduleItemDto[]> {
    const raceIds = await this.registrationRepo.findRaceIdsByOwner(ownerId);
    if (!raceIds.length) return [];

    const races = await this.raceRepo.findUpcomingRacesByIds(raceIds);
    const registrations =
      await this.registrationRepo.findConfirmedRegistrationsByOwnerAndRaces(
        ownerId,
        raceIds,
      );
    const regByRace = new Map(
      registrations.map((r: any) => [r.raceId.toString(), r]),
    );

    return Promise.all(
      races.map((r) => this.toOwnerDto(r, regByRace.get(r._id.toString()))),
    );
  }
}