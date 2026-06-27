import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { PrizeDistributionRepository } from './prize-distribution.repository';
import { PrizeRepository } from './prize.repository';
import { ContractRepository } from '../invitation/contract.repository';
import { TransactionRepository } from '../payment/transaction.repository';
import { RawResultRepository } from '../raw-result/raw-result.repository';
import { SystemWalletRepository } from '../payment/system-wallet.repository';
import { RaceRepository } from '../race/race.repository';
import { TournamentRepository } from '../tournament/tournament.repository';
import { UsersRepository } from '../user/user.repository';
import { TransactionTypeEnum } from '../../constants/transactionType.enum';
import { TransactionTitleEnum } from '../../constants/transactionTitleEnum.enum';
import { TournamentStatusEnum } from '../../constants/tournamentStatusEnum.enum';

@Injectable()
export class PrizeDistributionService {
  private readonly logger = new Logger(PrizeDistributionService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly prizeDistributionRepo: PrizeDistributionRepository,
    private readonly prizeRepo: PrizeRepository,
    private readonly systemWalletRepo: SystemWalletRepository,
    private readonly contractRepo: ContractRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly rawResultRepo: RawResultRepository,
    private readonly raceRepo: RaceRepository,
    private readonly tournamentRepo: TournamentRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  /**
   * Trao thưởng cho ngựa thắng (finalRank = 1) của race chung kết (round 2).
   * Được gọi tự động từ AdvancementService.handlePostConfirm() khi round 2 finish.
   *
   * Toàn bộ flow viết (PrizeDistribution, 2 Transaction, trừ SystemWallet,
   * 2 balance update, Tournament status) chạy trong 1 MongoDB session
   * transaction để đảm bảo all-or-nothing — nếu bất kỳ bước nào lỗi,
   * mọi thay đổi tự rollback.
   *
   * Các bước ĐỌC (winner, race, prize, contract, profiles) được thực hiện
   * TRƯỚC khi mở transaction, vì đây chỉ là validate/thu thập dữ liệu,
   * không cần nằm trong transaction.
   */
  async distributePrize(raceId: string): Promise<void> {
    // ---------- 1. Lấy ngựa thắng (finalRank = 1, status = Confirmed) ----------
    const winner = await this.rawResultRepo.findWinnerByRaceId(raceId);
    if (!winner) {
      throw new NotFoundException(
        `Không tìm thấy kết quả thắng (finalRank=1) cho race ${raceId}`,
      );
    }

    // ---------- 2. Idempotency check ----------
    const existing = await this.prizeDistributionRepo.findByRawResultId(
      winner._id.toString(),
    );
    if (existing) {
      throw new ConflictException(
        `Race ${raceId} đã được trao thưởng trước đó (PrizeDistribution: ${existing._id})`,
      );
    }

    // ---------- 3. Lấy tournamentId từ Race ----------
    const race = await this.raceRepo.findById(raceId);
    if (!race) {
      throw new NotFoundException(`Không tìm thấy Race ${raceId}`);
    }
    const tournamentId =
      (race.tournamentId as any)?._id?.toString() ??
      (race.tournamentId as any)?.toString();

    // ---------- 4. winner.jockeyId là JockeyProfile._id -> lấy userId thật ----------
    const jockeyProfile = await this.usersRepo.findJockeyProfileById(
      winner.jockeyId.toString(),
    );
    if (!jockeyProfile) {
      throw new NotFoundException(
        `Không tìm thấy JockeyProfile ${winner.jockeyId}`,
      );
    }
    const jockeyUserId =
      (jockeyProfile.userId as any)?._id?.toString() ??
      (jockeyProfile.userId as any)?.toString();

    // ---------- 5. Lấy Prize của tournament ----------
    const prize = await this.prizeRepo.findByTournamentId(tournamentId);
    if (!prize) {
      throw new NotFoundException(
        `Không tìm thấy Prize cho tournament ${tournamentId}`,
      );
    }

    // ---------- 6. Lấy Contract active ----------
    const contract = await this.contractRepo.findActiveContract(
      tournamentId,
      winner.horseId.toString(),
      jockeyUserId,
    );
    if (!contract) {
      throw new NotFoundException(
        `Không tìm thấy Contract active cho horse ${winner.horseId} / jockey ${jockeyUserId} trong tournament ${tournamentId}`,
      );
    }

    // ---------- 7. Tính tiền theo ownerShareRate / jockeyShareRate (đơn vị %, 0-100) ----------
    const ownerAmount = prize.amount * (contract.ownerShareRate / 100);
    const jockeyAmount = prize.amount * (contract.jockeyShareRate / 100);

    // contract.lean() vẫn có _id ở runtime, nhưng class Contract không khai báo
    // field này trong type nên TS không biết -> ép kiểu any để lấy _id
    const contractId = (contract as any)._id.toString();

    // ---------- 8. Resolve HorseOwnerProfile thật ----------
    const contractOwnerUserId =
      (contract.horseOwnerId as any)?._id?.toString() ??
      (contract.horseOwnerId as any)?.toString();

    const ownerProfile = await this.usersRepo.findHorseOwnerProfileByUserId(
      contractOwnerUserId,
    );
    if (!ownerProfile) {
      throw new NotFoundException(
        `Không tìm thấy HorseOwnerProfile cho user ${contractOwnerUserId}`,
      );
    }

    // ---------- 9. Kiểm tra ví hệ thống tồn tại ----------
    const systemWallet = await this.systemWalletRepo.findMainWallet();
    if (!systemWallet) {
      throw new NotFoundException('Không tìm thấy SystemWallet hệ thống');
    }

    // ============================================================
    // BẮT ĐẦU TRANSACTION — toàn bộ bước WRITE từ đây
    // ============================================================
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        // 10. Tạo PrizeDistribution (status mặc định Pending)
        const distribution = await this.prizeDistributionRepo.create(
          {
            prizeId: new Types.ObjectId(prize._id.toString()),
            contractId: new Types.ObjectId(contractId),
            rawResultId: new Types.ObjectId(winner._id.toString()),
            horseOwnerId: new Types.ObjectId(ownerProfile._id.toString()),
            jockeyId: new Types.ObjectId(jockeyProfile._id.toString()),
            ownerAmount,
            jockeyAmount,
          },
          session,
        );

        // 11. Tạo 2 Transaction (System -> HorseOwner, System -> Jockey)
        // senderId = null đại diện Platform/System (đối xứng với receiverId = null khi thu entry fee)
        await this.transactionRepo.createWithSession(
          {
            senderId: null,
            receiverId: new Types.ObjectId(contractOwnerUserId),
            amount: ownerAmount,
            type: TransactionTypeEnum.PRIZE_PAYOUT,
            content: TransactionTitleEnum.PRIZE_PAYOUT,
          },
          session,
        );

        await this.transactionRepo.createWithSession(
          {
            senderId: null,
            receiverId: new Types.ObjectId(jockeyUserId),
            amount: jockeyAmount,
            type: TransactionTypeEnum.PRIZE_PAYOUT,
            content: TransactionTitleEnum.PRIZE_PAYOUT,
          },
          session,
        );

        // 12. Trừ tiền khỏi SystemWallet (tổng 2 khoản đã trả ra)
        await this.systemWalletRepo.decreaseBalance(
          ownerAmount + jockeyAmount,
          session,
        );

        // 13. Cộng balance cho owner & jockey (atomic $inc)
        await this.usersRepo.incrementHorseOwnerBalance(
          ownerProfile._id.toString(),
          ownerAmount,
          session,
        );
        await this.usersRepo.incrementJockeyBalance(
          jockeyProfile._id.toString(),
          jockeyAmount,
          session,
        );

        // 14. Đánh dấu Distributed
        await this.prizeDistributionRepo.markDistributed(
          distribution._id.toString(),
          session,
        );

        // 15. Đóng tournament
        await this.tournamentRepo.updateTournamentWithSession(
          tournamentId,
          { status: TournamentStatusEnum.COMPLETED } as any,
          session,
        );
      });

      this.logger.log(
        `Đã trao thưởng thành công cho tournament ${tournamentId} (race ${raceId})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi khi trao thưởng cho race ${raceId}: ${message}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}