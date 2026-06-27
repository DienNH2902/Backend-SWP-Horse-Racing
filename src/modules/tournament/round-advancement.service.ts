import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RawResultRepository } from '../raw-result/raw-result.repository';
import { RaceRepository } from '../race/race.repository';
import { RoundAdvancementRepository } from './round-advancement.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import { RoundAdvancement } from './schemas/round-advancement.schema';

@Injectable()
export class AdvancementService {
  private readonly logger = new Logger(AdvancementService.name);

  constructor(
    private readonly rawResultRepository: RawResultRepository,
    private readonly raceRepository: RaceRepository,
    private readonly roundAdvancementRepository: RoundAdvancementRepository,
    private readonly registrationRepository: RegistrationRepository,
  ) {}

  /**
   * Được gọi tự động sau khi confirmFinalRank() xong.
   *
   * Round 1 → advance winner sang race vòng 2.
   * Round 2 (final) → KHÔNG còn tự động trao thưởng tại đây.
   * Trao thưởng giờ là bước riêng do ADMIN chủ động gọi qua
   * POST /prize-distribution/:raceId/distribute (xem PrizeDistributionModule).
   */
  async handlePostConfirm(raceId: string): Promise<void> {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Race not found');

    const tournamentId =
      (race.tournamentId as any)?._id?.toString() ??
      (race.tournamentId as any)?.toString();

    if (race.roundNumber === 1) {
      await this.advanceWinnerToRound2(raceId, tournamentId);
    }
    // race.roundNumber === 2: không làm gì ở đây nữa.
    // Admin sẽ tự gọi API trao thưởng sau khi xem kết quả final.
  }

  // ── ROUND ADVANCEMENT ────────────────────────────────────────────────────

  /**
   * Lấy winner (finalRank=1) của race vòng 1 → insert RoundAdvancement,
   * đồng thời chuyển Registration của ngựa đó sang race vòng 2.
   *
   * toRaceId = race vòng 2 của tournament (đã được admin tạo sẵn).
   *
   * Việc chuyển raceId của Registration (thay vì tạo Registration mới) là
   * bắt buộc để RaceService.getRaceById() (lấy horses từ Registration.raceId)
   * thấy được ngựa đã advance — tạo Registration mới sẽ vi phạm unique index
   * (tournamentId, horseId) và phải trả entryFee lần 2 không cần thiết.
   */
  private async advanceWinnerToRound2(
    fromRaceId: string,
    tournamentId: string,
  ): Promise<void> {
    // 1. Lấy winner race vòng 1
    const winner =
      await this.rawResultRepository.findWinnerByRaceId(fromRaceId);
    if (!winner) {
      this.logger.warn(`Race ${fromRaceId}: không tìm thấy winner để advance`);
      return;
    }

    const horseId = winner.horseId.toString();

    // 2. Chống duplicate
    const alreadyAdvanced =
      await this.roundAdvancementRepository.existsByFromRaceAndHorse(
        fromRaceId,
        horseId,
      );
    if (alreadyAdvanced) {
      this.logger.warn(
        `Horse ${horseId} đã được advance từ race ${fromRaceId}`,
      );
      return;
    }

    // 3. Tìm race vòng 2 của tournament
    const round2Races = await this.raceRepository.findByTournamentAndRound(
      tournamentId,
      2,
    );
    if (!round2Races || round2Races.length === 0) {
      throw new NotFoundException(
        `Chưa có race vòng 2 cho tournament ${tournamentId}. Admin cần tạo trước.`,
      );
    }
    // Tournament 2 round cố định → chỉ có 1 race vòng 2 (chung kết)
    const round2Race = round2Races[0];
    const toRaceId = (round2Race as any)._id.toString();

    // 4. Insert RoundAdvancement (lịch sử audit)
    await this.roundAdvancementRepository.create({
      fromRaceId: new Types.ObjectId(fromRaceId),
      toRaceId: new Types.ObjectId(toRaceId),
      horseId: new Types.ObjectId(horseId),
      advancedAt: new Date(),
    });

    // 5. Chuyển Registration hiện có (CONFIRMED ở vòng 1) sang raceId vòng 2
    const registration =
      await this.registrationRepository.findActiveByTournamentAndHorse(
        tournamentId,
        horseId,
      );
    if (!registration) {
      throw new NotFoundException(
        `Không tìm thấy Registration active cho horse ${horseId} trong tournament ${tournamentId} — không thể chuyển sang race vòng 2`,
      );
    }
    await this.registrationRepository.updateRaceIdForAdvancement(
      (registration as any)._id.toString(),
      toRaceId,
    );

    this.logger.log(
      `✅ Horse ${horseId} advanced từ race ${fromRaceId} → round 2 race ${toRaceId}`,
    );
  }

  // ── XEM LỊCH SỬ ADVANCEMENT ──────────────────────────────────────────────

  async getAdvancementsByTournament(
    tournamentId: string,
  ): Promise<RoundAdvancement[]> {
    const round2Races = await this.raceRepository.findByTournamentAndRound(
      tournamentId,
      2,
    );
    if (!round2Races || round2Races.length === 0) return [];
    const toRaceId = (round2Races[0] as any)._id.toString();
    return this.roundAdvancementRepository.findByToRaceId(toRaceId);
  }

  async getAdvancementByFromRace(
    fromRaceId: string,
  ): Promise<RoundAdvancement[]> {
    return this.roundAdvancementRepository.findByFromRaceId(fromRaceId);
  }
}