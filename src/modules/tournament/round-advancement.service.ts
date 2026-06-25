import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RawResultRepository } from '../raw-result/raw-result.repository';
import { RaceRepository } from '../race/race.repository';
import { RoundAdvancementRepository } from './round-advancement.repository';
import { PrizeDistributionRepository } from '../prize-distribution/prize-distribution.repository'; 
import { RawResultStatus } from 'src/constants/rawResultStatus.enum';
import { RoundAdvancement } from './schemas/round-advancement.schema';



@Injectable()
export class AdvancementService {
  private readonly logger = new Logger(AdvancementService.name);

  constructor(
    private readonly rawResultRepository: RawResultRepository,
    private readonly raceRepository: RaceRepository,
    private readonly roundAdvancementRepository: RoundAdvancementRepository,
    private readonly prizeDistributionRepository: PrizeDistributionRepository,

  ) {}

  /**
   * Được gọi tự động sau khi confirmFinalRank() xong.
   * Quyết định: round 1 → advance, round 2 (final) → distribute prize.
   */
  async handlePostConfirm(raceId: string): Promise<void> {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Race not found');

    const tournamentId = race.tournamentId?._id?.toString() ?? race.tournamentId?.toString();

    if (race.roundNumber === 1) {
      await this.advanceWinnerToRound2(raceId, tournamentId);
    } else if (race.roundNumber === 2) {
      await this.distributePrize(raceId, tournamentId);
    }
  }

  // ── ROUND ADVANCEMENT ────────────────────────────────────────────────────

  /**
   * Lấy winner (finalRank=1) của race vòng 1 → insert RoundAdvancement.
   * toRaceId = race vòng 2 của tournament (đã được admin tạo sẵn).
   */
  private async advanceWinnerToRound2(
    fromRaceId: string,
    tournamentId: string,
  ): Promise<void> {
    // 1. Lấy winner race vòng 1
    const winner = await this.rawResultRepository.findWinnerByRaceId(fromRaceId);
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
      this.logger.warn(`Horse ${horseId} đã được advance từ race ${fromRaceId}`);
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
    const toRaceId = round2Race._id.toString();

    // 4. Insert RoundAdvancement
    await this.roundAdvancementRepository.create({
      fromRaceId: new Types.ObjectId(fromRaceId),
      toRaceId: new Types.ObjectId(toRaceId),
      horseId: new Types.ObjectId(horseId),
      advancedAt: new Date(),
    });

    this.logger.log(
      `✅ Horse ${horseId} advanced từ race ${fromRaceId} → round 2 race ${toRaceId}`,
    );
  }

  // ── PRIZE DISTRIBUTION ───────────────────────────────────────────────────

  /**
   * Phân chia prize cho winner race vòng 2 (chung kết).
   * ownerAmount = prize.amount × contract.ownerShareRate
   * jockeyAmount = prize.amount × contract.jockeyShareRate
   */
  private async distributePrize(
    raceId: string,
    tournamentId: string,
  ): Promise<void> {
    // 1. Lấy winner
    const winner = await this.rawResultRepository.findWinnerByRaceId(raceId);
    if (!winner) throw new NotFoundException('Không tìm thấy winner để distribute prize');

    const horseId = winner.horseId.toString();
    const jockeyId = winner.jockeyId.toString();
    const rawResultId = winner._id.toString();

    // 2. Chống duplicate distribute
    const existed = await this.prizeDistributionRepository.findByRawResultId(rawResultId);
    if (existed) {
      this.logger.warn(`Prize đã được distribute cho rawResult ${rawResultId}`);
      return;
    }

    // ── Các bước dưới cần bạn uncomment sau khi inject đủ repository ────────

    // 3. Lấy Prize của tournament
    // const prize = await this.prizeRepository.findByTournamentId(tournamentId);
    // if (!prize) throw new NotFoundException(`Không tìm thấy Prize cho tournament ${tournamentId}`);

    // 4. Lấy Contract: horseId + jockeyId + tournamentId
    // const contract = await this.contractRepository.findByHorseJockeyTournament(
    //   horseId, jockeyId, tournamentId,
    // );
    // if (!contract) throw new NotFoundException('Không tìm thấy Contract cho cặp horse-jockey này');

    // 5. Tính số tiền
    // const ownerAmount = prize.amount * contract.ownerShareRate;
    // const jockeyAmount = prize.amount * contract.jockeyShareRate;

    // 6. Lấy HorseOwnerProfile (userId của horse)
    // const horse = await this.horseRepository.findById(horseId);
    // const ownerProfile = await this.horseOwnerProfileRepository.findByUserId(horse.userId.toString());
    // if (!ownerProfile) throw new NotFoundException('Không tìm thấy HorseOwnerProfile');

    // 7. Insert PrizeDistribution record
    // const distRecord = await this.prizeDistributionRepository.create({
    //   prizeId: prize._id,
    //   contractId: contract._id,
    //   rawResultId: new Types.ObjectId(rawResultId),
    //   horseOwnerId: ownerProfile._id,
    //   jockeyId: new Types.ObjectId(jockeyId),
    //   ownerAmount,
    //   jockeyAmount,
    //   status: PrizeDistributionStatus.PENDING,
    // });

    // 8. Insert 2 Transaction (system → owner, system → jockey)
    // await this.transactionRepository.create({
    //   senderId: null,           // system
    //   receiverId: ownerProfile.userId,
    //   amount: ownerAmount,
    //   type: TransactionType.PRIZE,
    //   content: `Tiền thưởng giải đấu - chủ ngựa`,
    // });
    // await this.transactionRepository.create({
    //   senderId: null,
    //   receiverId: winner.jockeyId,  // userId của jockey
    //   amount: jockeyAmount,
    //   type: TransactionType.PRIZE,
    //   content: `Tiền thưởng giải đấu - jockey`,
    // });

    // 9. Update balance
    // await this.horseOwnerProfileRepository.incrementBalance(ownerProfile._id.toString(), ownerAmount);
    // await this.jockeyProfileRepository.incrementBalance(jockeyId, jockeyAmount);

    // 10. Mark distributed
    // await this.prizeDistributionRepository.markDistributed(distRecord._id.toString());

    // 11. Update Tournament.status = Completed
    // await this.tournamentRepository.updateStatus(tournamentId, TournamentStatus.COMPLETED);

    this.logger.log(`✅ Prize distributed cho winner horse ${horseId}, jockey ${jockeyId}`);
    this.logger.log(`⚠️  Uncomment các bước trong distributePrize() sau khi inject đủ repository`);
  }


  async getAdvancementsByTournament(tournamentId: string): Promise<RoundAdvancement[]> {
  const round2Races = await this.raceRepository.findByTournamentAndRound(tournamentId, 2);
  if (!round2Races || round2Races.length === 0) return [];
  const toRaceId = (round2Races[0] as any)._id.toString();
  return this.roundAdvancementRepository.findByToRaceId(toRaceId);
}

  async getAdvancementByFromRace(fromRaceId: string): Promise<RoundAdvancement[]> {
    return this.roundAdvancementRepository.findByFromRaceId(fromRaceId);
  }
}