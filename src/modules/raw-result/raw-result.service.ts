import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { RawResultRepository } from './raw-result.repository';
import { RaceRepository } from '../race/race.repository';
import { HorseRepository } from '../horse/horse.repository';
import { UsersRepository } from '../user/user.repository';

import { AdvancementService } from '../tournament/round-advancement.service';

import { ConfirmFinalRankDto } from './dto/confirm-final-rank.dto';
import { RawResult } from './schemas/raw-result.schema';
import { RawResultStatus } from '../../constants/rawResultStatus.enum';
import { RaceStatusEnum } from '../../constants/raceStatus.enum';
import { BetService } from '../bet/bet.service';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { SpectatorProfile } from '../user/schemas/spectator-profile.schema';
import { NotificationRepository } from '../notification/notification.repository';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';

@Injectable()
export class RawResultService {
  private readonly logger = new Logger(RawResultService.name);

  constructor(
    private readonly rawResultRepository: RawResultRepository,
    private readonly raceRepository: RaceRepository,
    private readonly advancementService: AdvancementService,
    private readonly betService: BetService,
    private readonly horseRepository: HorseRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationRepository: NotificationRepository,
    @InjectModel(SpectatorProfile.name)
    private readonly spectatorProfileModel: Model<SpectatorProfile>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Referee confirm finalRank cho toàn bộ ngựa trong race.
   * Logic:
   *  1. Lấy tất cả RawResult của race, sort theo rawRank ASC
   *  2. Những ngựa trong disqualifiedHorseIds → status = Disqualified, finalRank = null
   *  3. Những ngựa còn lại → re-rank liên tục từ 1 (Option A: shift lên)
   *  4. Trong 1 transaction:
   *     a. Atomic lock race (ONGOING → FINISHED) — chống double-submit
   *     b. bulkWrite finalRank/status vào RawResult
   *     c. Cập nhật totalRace/totalWin/winRate cho Horse + JockeyProfile
   *  5. Trả thưởng cá cược (không chặn luồng chính nếu lỗi)
   *  6. Auto advance (round 1) hoặc distribute prize (round 2)
   */
  async confirmFinalRank(
    raceId: string,
    refereeId: string,
    dto: ConfirmFinalRankDto,
  ): Promise<{ message: string; finalRankings: any[] }> {
    const race = await this.raceRepository.findOneRace({ _id: raceId });
    if (!race) throw new NotFoundException('Race not found');

    if (race.status !== RaceStatusEnum.ONGOING) {
      throw new BadRequestException(
        `Không thể confirm kết quả: race đang ở trạng thái ${race.status}. Yêu cầu: Ongoing`,
      );
    }

    const raceRefereeId =
      race.refereeId?._id?.toString() ?? race.refereeId?.toString();
    if (raceRefereeId !== refereeId) {
      throw new ForbiddenException(
        'Bạn không phải referee được phân công cho race này',
      );
    }

    const rawResults = await this.rawResultRepository.findByRaceId(raceId);
    if (!rawResults || rawResults.length === 0) {
      throw new NotFoundException(
        'Không tìm thấy kết quả simulation cho race này',
      );
    }

    const disqualifiedSet = new Set(dto.disqualifiedHorseIds ?? []);

    // Validate: disqualifiedHorseIds phải là horseId thực sự trong race
    if (disqualifiedSet.size > 0) {
      const horseIdsInRace = new Set(
        rawResults.map((r) => r.horseId.toString()),
      );
      for (const hId of disqualifiedSet) {
        if (!horseIdsInRace.has(hId)) {
          throw new BadRequestException(`horseId ${hId} không thuộc race này`);
        }
      }
    }

    // 3. Sort rawResults theo rawRank ASC
    const sorted = [...rawResults].sort((a, b) => a.rawRank - b.rawRank);

    // 4. Tính finalRank
    //    - Disqualified → finalRank = null
    //    - Còn lại → rank liên tục từ 1 (shift lên, Option A)
    let rankCounter = 1;
    const updates: Array<{
      id: string;
      finalRank: number | null;
      status: RawResultStatus;
    }> = [];

    const finalRankingsForResponse: any[] = [];
    let winnerHorseId: string | null = null; // ID của ngựa thắng cuộc thực tế (sau khi loại ngựa vi phạm)

    for (const result of sorted) {
      const horseIdStr = result.horseId.toString();
      const isDisqualified = disqualifiedSet.has(horseIdStr);

      if (isDisqualified) {
        updates.push({
          id: result._id.toString(),
          finalRank: null,
          status: RawResultStatus.DISQUALIFIED,
        });
        finalRankingsForResponse.push({
          horseId: horseIdStr,
          rawRank: result.rawRank,
          finalRank: null,
          status: RawResultStatus.DISQUALIFIED,
        });
        this.logger.log(`Horse ${horseIdStr} → DISQUALIFIED`);
      } else {
        updates.push({
          id: result._id.toString(),
          finalRank: rankCounter,
          status: RawResultStatus.CONFIRMED,
        });
        finalRankingsForResponse.push({
          horseId: horseIdStr,
          rawRank: result.rawRank,
          finalRank: rankCounter,
          status: RawResultStatus.CONFIRMED,
        });

        // Xác định con ngựa đầu tiên đạt hạng 1 (sau khi đã lọc ngựa vi phạm)
        if (rankCounter === 1) {
          winnerHorseId = horseIdStr;
        }

        this.logger.log(
          `Horse ${horseIdStr} → finalRank ${rankCounter} (rawRank ${result.rawRank})`,
        );
        rankCounter++;
      }
    }

    // 5. Transaction: lock race + bulk update finalRank/status + cập nhật win-stat
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        // Atomic lock: chỉ 1 request được phép tiếp tục nếu race còn ONGOING.
        // Nếu request khác đã confirm trước (dù chỉ vài ms) → ném lỗi ngay,
        // KHÔNG chạy bulkUpdate/win-increment để tránh cộng dồn sai (chống double-submit).
        const locked = await this.raceRepository.tryTransitionStatus(
          raceId,
          RaceStatusEnum.ONGOING,
          RaceStatusEnum.FINISHED,
          session,
        );
        if (!locked) {
          throw new ConflictException(
            'Race đã được confirm bởi một request khác hoặc không còn ở trạng thái Ongoing',
          );
        }

        await this.rawResultRepository.bulkUpdateFinalRankAndStatus(
          updates,
          session,
        );

        const jockeyIdsToFree: string[] = [];

        // Cập nhật totalRace/totalWin/winRate cho từng ngựa & jockey đã đua.
        // Đã xác nhận với team: DISQUALIFIED vẫn tính totalRace (+1),
        // chỉ loại khỏi totalWin (isWinner tự động false vì horseIdStr !== winnerHorseId).
        for (const result of sorted) {
          const horseIdStr = result.horseId.toString();
          const jockeyIdStr = result.jockeyId.toString();
          const isWinner = horseIdStr === winnerHorseId;

          jockeyIdsToFree.push(jockeyIdStr);

          await this.horseRepository.incrementHorseRaceStats(
            horseIdStr,
            isWinner,
            session,
          );
          await this.usersRepository.incrementJockeyRaceStats(
            result.jockeyId.toString(),
            isWinner,
            session,
          );
        }

        // 🟢 CẬP NHẬT TRẠNG THÁI CÁC JOCKEY VỀ AVAILABLE
        if (jockeyIdsToFree.length > 0) {
          await this.usersRepository.updateManyStatus(
            jockeyIdsToFree.map((id) => new Types.ObjectId(id)),
            JockeyStatusEnum.AVAILABLE,
            session, // Truyền session vào để đảm bảo tính nguyên tử
          );
          this.logger.log(
            `[CONFIRM] ✅ Đã trả trạng thái ${jockeyIdsToFree.length} Jockey về AVAILABLE`,
          );
        }
      });
    } finally {
      await session.endSession();
    }
    this.logger.log(`Đã update finalRank cho ${updates.length} ngựa`);
    this.logger.log(`Race ${raceId} → status Finished`);

    // ==========================================
    // BỔ SUNG: KÍCH HOẠT THÔNG BÁO
    // ==========================================
    // 1. Lấy danh sách tất cả các user có vai trò SPECTATOR
    const spectators = await this.spectatorProfileModel.find().lean();

    // 2. Map dữ liệu tạo notification cho từng Spectator
    if (spectators.length > 0) {
      const notifications = spectators.map((spectator) => ({
        userId: spectator.userId,
        type: NotificationTypeEnum.RACE_BROADCAST_END,
        title: NotificationTitleEnum.RACE_BROADCAST_END,
        content: `Cuộc đua ${race.name || raceId} đã kết thúc!`,
        isRead: false,
      }));

      // 3. Insert hàng loạt vào DB
      await this.notificationRepository.createMany(notifications);
    }

    // ==========================================
    // BỔ SUNG: KÍCH HOẠT XỬ LÝ TRẢ THƯỞNG CÁ CƯỢC HỆ THỐNG
    // ==========================================
    if (winnerHorseId) {
      try {
        await this.betService.processRaceBetSettlement(raceId, winnerHorseId);
        this.logger.log(
          `Đã phân phối điểm thưởng cá cược thành công cho race ${raceId}`,
        );
      } catch (betError) {
        // Ghi log lỗi cá cược nhưng không chặn luồng kết thúc trận đấu chính
        this.logger.error(
          `Lỗi trả thưởng cá cược tại race ${raceId}:`,
          betError,
        );
      }
    }
    // ==========================================

    // 1. Lấy danh sách tất cả các user có vai trò SPECTATOR
    // const spectators = await this.spectatorProfileModel.find().lean();

    // 2. Map dữ liệu tạo notification cho từng Spectator
    // if (spectators.length > 0) {
    //   const notifications = spectators.map((spectator) => ({
    //     userId: spectator.userId,
    //     type: NotificationTypeEnum.RACE_BROADCAST_END,
    //     title: NotificationTitleEnum.RACE_BROADCAST_END,
    //     content: `Cuộc đua ${race.name || raceId} đã kết thúc!`,
    //     isRead: false,
    //   }));

    //   3. Insert hàng loạt vào DB
    //   await this.notificationRepository.createMany(notifications);
    // }

    // 6. Auto advance (round 1) hoặc distribute prize (round 2)
    await this.advancementService.handlePostConfirm(raceId);
    this.logger.log(`handlePostConfirm done cho race ${raceId}`);

    return {
      message: 'Xác nhận kết quả thành công',
      finalRankings: finalRankingsForResponse,
    };
  }

  async getRawResults(raceId: string): Promise<RawResult[]> {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Race not found');
    return this.rawResultRepository.findByRaceIdSortedByRawRank(raceId);
  }

  async getFinalResults(raceId: string): Promise<any[]> {
    const race = await this.raceRepository.findOneRace({ _id: raceId });
    if (!race) throw new NotFoundException('Race not found');

    const results =
      await this.rawResultRepository.findFinalResultsByRaceId(raceId);

    return results
      .filter((r) => r.status !== RawResultStatus.PENDING)
      .sort((a, b) => {
        if (a.finalRank === null) return 1;
        if (b.finalRank === null) return -1;
        return a.finalRank - b.finalRank;
      })
      .map((r: any) => ({
        raceId: r.raceId?._id?.toString() ?? r.raceId?.toString(),
        raceName: r.raceId?.name ?? null,

        horseId: r.horseId?._id?.toString() ?? r.horseId?.toString(),
        horseName: r.horseId?.name ?? null,

        jockeyId: r.jockeyId?._id?.toString() ?? r.jockeyId?.toString(),
        jockeyName: r.jockeyId?.userId?.fullName ?? null,

        horseOwnerId:
          r.horseId?.userId?._id?.toString() ??
          r.horseId?.userId?.toString() ??
          null,
        horseOwnerName: r.horseId?.userId?.fullName ?? null,

        rawRank: r.rawRank,
        finalRank: r.finalRank,
        status: r.status,

        finishedTime: r.finishedTime,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
  }
}
