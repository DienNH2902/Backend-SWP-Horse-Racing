import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { RawResultRepository } from './raw-result.repository';
import { RaceRepository } from '../race/race.repository';
import { RefereeReportService } from '../referee-report/referee-report.service';
import { AdvancementService } from '../tournament/round-advancement.service';

import { ConfirmFinalRankDto } from './dto/confirm-final-rank.dto';
import { RawResult } from './schemas/raw-result.schema';
import { RawResultStatus } from '../../constants/rawResultStatus.enum';
import { RaceStatusEnum } from '../../constants/raceStatus.enum';
import { BetService } from '../bet/bet.service';

@Injectable()
export class RawResultService {
  private readonly logger = new Logger(RawResultService.name);

  constructor(
    private readonly rawResultRepository: RawResultRepository,
    private readonly raceRepository: RaceRepository,
    private readonly refereeReportService: RefereeReportService,
    private readonly advancementService: AdvancementService,
    private readonly betService: BetService,
  ) {}

  /**
   * Referee confirm finalRank cho toàn bộ ngựa trong race.
   * Logic:
   *  1. Lấy tất cả RawResult của race, sort theo rawRank ASC
   *  2. Những ngựa trong disqualifiedHorseIds → status = Disqualified, finalRank = null
   *  3. Những ngựa còn lại → re-rank liên tục từ 1 (Option A: shift lên)
   *  4. bulkWrite vào DB
   *  5. Tạo RefereeReport type=End
   *  6. Update Race.status = Finished
   *  7. Auto advance (round 1) hoặc distribute prize (round 2)
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

    // 5. Bulk update DB
    await this.rawResultRepository.bulkUpdateFinalRankAndStatus(updates);
    this.logger.log(`Đã update finalRank cho ${updates.length} ngựa`);

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

    // 6. Update Race.status = Finished
    await this.raceRepository.updateStatus(raceId, RaceStatusEnum.FINISHED);
    this.logger.log(`Race ${raceId} → status Finished`);

    // 7. Auto advance (round 1) hoặc distribute prize (round 2)
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

    const results = await this.rawResultRepository.findByRaceId(raceId);
    return results
      .filter((r) => r.status !== RawResultStatus.PENDING)
      .sort((a, b) => {
        if (a.finalRank === null) return 1;
        if (b.finalRank === null) return -1;
        return a.finalRank - b.finalRank;
      });
  }
}