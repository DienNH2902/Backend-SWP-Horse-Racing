// src/bet/bet.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { BetRepository } from './bet.repository';
import { CreateBetDto } from './dto/create-bet.dto';
import { UpdateBetDto } from './dto/update-bet.dto';
import { ResponseBetDto } from './dto/response-bet.dto';
import { RegistrationRepository } from '../registration/registration.repository';
import { RaceRepository } from '../race/race.repository';
import { HorseRepository } from '../horse/horse.repository';
import { PointsTransactionService } from '../points-transaction/points-transaction.service';
import { NotificationRepository } from '../notification/notification.repository';
import { SpectatorProfile } from '../user/schemas/spectator-profile.schema';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';
import { BetResultEnum } from 'src/constants/betResultStatusEnum.enum';
import { PointsTransactionType } from 'src/constants/pointsTransactionTypeEnum.enum';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { RewardRepository } from '../reward/reward.repository';
import { RewardType } from 'src/constants/rewardTypeEnum.enum';

@Injectable()
export class BetService {
  constructor(
    private readonly betRepository: BetRepository,
    private readonly raceRepository: RaceRepository,
    private readonly horseRepository: HorseRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly pointsTransactionService: PointsTransactionService,
    private readonly notificationRepository: NotificationRepository,
    private readonly rewardRepository: RewardRepository,
    @InjectModel(SpectatorProfile.name)
    private readonly spectatorModel: Model<SpectatorProfile>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Giải quyết lấy ID chuỗi bất kể trường dữ liệu có được populate hay không
   */
  private resolveId(field: any): string {
    return field?._id?.toString() || field?.toString();
  }

  /**
   * Chuyển đổi dữ liệu sang Response DTO tập trung
   */
  private toResponse(data: any): ResponseBetDto {
    return plainToInstance(ResponseBetDto, data, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Tính toán tỷ lệ Odds theo thuật toán lõi
   */
  public calculateOdds(
    winRatePercentage: number,
    totalBettors: number,
    horseBettors: number,
  ): number {
    const winRate = winRatePercentage / 100;

    let baseOdds = 5.0;
    if (winRate > 0) {
      baseOdds = 1 / winRate;
    }

    const totalPeople = Math.max(totalBettors, 1);
    const crowdBonus = 1 + (totalPeople - horseBettors) / totalPeople;

    let finalOdds = baseOdds * crowdBonus;
    finalOdds = Math.min(finalOdds, 50.0);

    return Math.round(finalOdds * 100) / 100;
  }

  async findAllBets(): Promise<ResponseBetDto> {
    const bets = await this.betRepository.findAllBets();
    return this.toResponse(bets);
  }

  async findAllMyBets(userId: string): Promise<ResponseBetDto> {
    const spectator = await this.spectatorModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!spectator)
      throw new NotFoundException('Không tìm thấy Profile của Spectator này');
    const bets = await this.betRepository.findAllMyBets(
      spectator._id.toString(),
    );
    return this.toResponse(bets);
  }

  async findBetById(id: string): Promise<ResponseBetDto> {
    const bet = await this.betRepository.findById(id);
    return this.toResponse(bet);
  }

  /**
   * ĐẶT CƯỢC MỚI
   */
  async createBet(userId: string, dto: CreateBetDto): Promise<ResponseBetDto> {
    const spectator = await this.spectatorModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!spectator) {
      throw new NotFoundException(
        'Không tìm thấy hồ sơ người xem (Spectator Profile)',
      );
    }

    const race = await this.raceRepository.findOneRace({ _id: dto.raceId });
    if (!race) throw new NotFoundException('Không tìm thấy vòng đua');

    if (race.status !== RaceStatusEnum.SCHEDULED) {
      throw new BadRequestException(
        `Không thể đặt cược. Vòng đua đã ở trạng thái: ${race.status}`,
      );
    }

    const isHorseInRace =
      await this.registrationRepository.findActiveByTournamentAndHorse(
        this.resolveId(race.tournamentId),
        dto.horseId,
      );
    if (!isHorseInRace) {
      throw new BadRequestException(
        'Ngựa này không tham gia thi đấu trong vòng đua hiện tại',
      );
    }

    const existingBet = await this.betRepository.findBySpectatorAndRace(
      this.resolveId(spectator),
      dto.raceId,
    );
    if (existingBet) {
      throw new ConflictException(
        'Bạn đã cá cược cho vòng đua này rồi. Vui lòng sử dụng tính năng cập nhật cược.',
      );
    }

    if (spectator.pointBalance < dto.pointsWagered) {
      throw new BadRequestException(
        'Số dư điểm thưởng của bạn không đủ để thực hiện đặt cược',
      );
    }

    const horse = await this.horseRepository.findOneHorse({ _id: dto.horseId });
    if (!horse) throw new NotFoundException('Không tìm thấy thông tin ngựa');

    const totalBettors = await this.betRepository.countTotalBettorsInRace(
      dto.raceId,
    );
    const horseBettors = await this.betRepository.countBettorsOnHorse(
      dto.raceId,
      dto.horseId,
    );

    // 1. Tìm tất cả các claims chưa sử dụng của User này
    const unusedClaims = await this.rewardRepository['claimedRewardModel']
      .find({ userId: new Types.ObjectId(userId), isUsed: false })
      .populate('rewardId');

    // 2. Lọc ra thẻ bảo hiểm thực tế chưa dùng
    const targetInsuranceClaim = unusedClaims.find(
      (c) => (c.rewardId as any)?.rewardType === RewardType.INSURANCE_CARD,
    );

    // 3. Chỉ kích hoạt bảo hiểm khi User MUỐN DÙNG và THỰC SỰ CÓ THẺ CHƯA DÙNG
    if (dto.useInsuranceCard && !targetInsuranceClaim) {
      throw new BadRequestException(
        'Bạn không sở hữu thẻ bảo hiểm khả dụng để sử dụng',
      );
    }
    const isInsuranceApplied = !!(dto.useInsuranceCard && targetInsuranceClaim);

    const finalOdds = this.calculateOdds(
      horse.winRate || 0,
      totalBettors + 1,
      horseBettors + 1,
    );

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Nếu áp dụng thẻ bảo hiểm, tiến hành đánh dấu đã sử dụng trong session
      if (isInsuranceApplied && targetInsuranceClaim) {
        await this.rewardRepository['claimedRewardModel'].findByIdAndUpdate(
          targetInsuranceClaim._id,
          { $set: { isUsed: true } },
          { session },
        );
      }

      // Đếm số lượng cược thắng hiện tại trong DB để tính lại winRate mới khi totalBets tăng lên 1
      const currentWinBets = await this.betRepository['betModel']
        .countDocuments({
          spectatorId: spectator._id,
          result: BetResultEnum.WIN,
        })
        .session(session);

      const newTotalBets = (spectator.totalBets || 0) + 1;
      const newWinRate =
        Math.round((currentWinBets / newTotalBets) * 100 * 100) / 100;

      const updatedSpectator = await this.spectatorModel.findByIdAndUpdate(
        spectator._id,
        {
          $inc: { pointBalance: -dto.pointsWagered, totalBets: 1 },
          $set: { winRate: newWinRate },
        },
        { returnDocument: 'after', session },
      );

      if (!updatedSpectator) {
        throw new BadRequestException('Cập nhật profile lỗi');
      }

      const newBet = await this.betRepository.create(
        {
          spectatorId: spectator._id as Types.ObjectId,
          raceId: new Types.ObjectId(dto.raceId),
          horseId: new Types.ObjectId(dto.horseId),
          horseWinRateAtBet: horse.winRate || 0,
          bettorsOnHorseAtBet: horseBettors + 1,
          totalBettorsAtBet: totalBettors + 1,
          finalOdds,
          pointsWagered: dto.pointsWagered,
          result: BetResultEnum.PENDING,
          placedAt: new Date(),
          isInsuranceCardUsed: isInsuranceApplied,
        },
        session,
      );

      await this.pointsTransactionService.logTransaction({
        userId,
        type: PointsTransactionType.SPEND,
        amount: dto.pointsWagered,
        balanceAfter: updatedSpectator.pointBalance,
        reason: `Đặt cược vòng đua mã [${dto.raceId}] vào ngựa [${horse.name}]`,
      });

      await this.notificationRepository.create({
        userId: new Types.ObjectId(userId),
        type: NotificationTypeEnum.PLACE_BET_SUCCESS,
        title: NotificationTitleEnum.PLACE_BET_SUCCESS,
        content: `Bạn đã cược thành công ${dto.pointsWagered} điểm vào ngựa ${horse.name}.`,
        isRead: false,
      });

      await session.commitTransaction();
      return this.toResponse(newBet.toObject());
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * CẬP NHẬT THAY ĐỔI CƯỢC
   */
  async updateBet(
    userId: string,
    betId: string,
    dto: UpdateBetDto,
  ): Promise<ResponseBetDto> {
    const bet = await this.betRepository.findById(betId);
    if (!bet) {
      throw new NotFoundException('Không tìm thấy thông tin đơn cược cần sửa');
    }

    const race = await this.raceRepository.findOneRace({
      _id: this.resolveId(bet.raceId),
    });

    if (!race) {
      throw new NotFoundException(
        `Không tìm thấy race ${this.resolveId(bet.raceId)}`,
      );
    }
    if (race.status !== RaceStatusEnum.SCHEDULED) {
      throw new BadRequestException(
        `Vòng đua đã chuyển trạng thái sang ${race.status}. Không cho phép sửa đổi cược.`,
      );
    }

    const spectator = await this.spectatorModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (
      !spectator ||
      this.resolveId(bet.spectatorId) !== this.resolveId(spectator)
    ) {
      throw new BadRequestException(
        'Bạn không sở hữu quyền chỉnh sửa đơn cược này',
      );
    }

    const isHorseInRace =
      await this.registrationRepository.findActiveByTournamentAndHorse(
        this.resolveId(race.tournamentId),
        dto.horseId,
      );
    if (!isHorseInRace) {
      throw new BadRequestException(
        'Ngựa mới lựa chọn không thuộc danh sách đua này',
      );
    }

    const horse = await this.horseRepository.findOneHorse({ _id: dto.horseId });
    if (!horse) {
      throw new NotFoundException('Không tìm thấy thông tin chiến mã mới');
    }

    const unusedClaims = await this.rewardRepository['claimedRewardModel']
      .find({ userId: new Types.ObjectId(userId), isUsed: false })
      .populate('rewardId');

    const targetInsuranceClaim = unusedClaims.find(
      (c) => (c.rewardId as any)?.rewardType === RewardType.INSURANCE_CARD,
    );

    // Validate request sửa đổi trạng thái bảo hiểm
    // Nếu đơn cũ CHƯA DÙNG, đơn mới MUỐN DÙNG thì bắt buộc phải có thẻ mới trong kho
    if (
      !bet.isInsuranceCardUsed &&
      dto.useInsuranceCard &&
      !targetInsuranceClaim
    ) {
      throw new BadRequestException(
        'Bạn không sở hữu thẻ bảo hiểm khả dụng để sử dụng',
      );
    }

    // Xác định trạng thái cuối cùng của đơn cược có được bảo hiểm hay không
    // Trạng thái true khi: Đơn cũ đã dùng sẵn rồi HOẶC đơn mới kích hoạt thành công với thẻ mới
    const isInsuranceApplied =
      dto.useInsuranceCard !== undefined
        ? !!(
            dto.useInsuranceCard &&
            (bet.isInsuranceCardUsed || targetInsuranceClaim)
          )
        : bet.isInsuranceCardUsed;

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // TRƯỜNG HỢP 1: Đơn cũ CHƯA DÙNG -> Đơn mới MUỐN DÙNG (Tiêu hao thẻ)
      if (
        !bet.isInsuranceCardUsed &&
        dto.useInsuranceCard &&
        targetInsuranceClaim
      ) {
        await this.rewardRepository['claimedRewardModel'].findByIdAndUpdate(
          targetInsuranceClaim._id,
          { $set: { isUsed: true } },
          { session },
        );
      }

      // TRƯỜNG HỢP 2: Đơn cũ ĐÃ DÙNG -> Đơn mới KHÔNG MUỐN DÙNG (Hoàn trả thẻ)
      if (bet.isInsuranceCardUsed && dto.useInsuranceCard === false) {
        // Tìm đúng 1 thẻ đã dùng (isUsed: true) của user này để hoàn trả lại kho
        const usedInsuranceClaim = await this.rewardRepository[
          'claimedRewardModel'
        ]
          .findOne({ userId: new Types.ObjectId(userId), isUsed: true })
          .populate('rewardId');

        // Lọc đúng loại thẻ bảo hiểm
        if (
          usedInsuranceClaim &&
          (usedInsuranceClaim.rewardId as any)?.rewardType ===
            RewardType.INSURANCE_CARD
        ) {
          await this.rewardRepository['claimedRewardModel'].findByIdAndUpdate(
            usedInsuranceClaim._id,
            { $set: { isUsed: false } },
            { session },
          );
        }
      }

      // 1. TỐI ƯU DÒNG TIỀN: Tính toán chênh lệch điểm cược (Mới - Cũ)
      // Nếu delta > 0: Bạn cược thêm tiền -> cần kiểm tra xem ví đủ không
      // Nếu delta < 0: Bạn giảm tiền cược -> hệ thống sẽ cộng lại tiền thừa vào ví
      const deltaPoints = dto.pointsWagered - bet.pointsWagered;

      if (deltaPoints > 0 && spectator.pointBalance < deltaPoints) {
        throw new BadRequestException(
          'Số dư tài khoản không đủ để tăng mức cược mới',
        );
      }

      // Cập nhật số dư ví 1 lần duy nhất
      const finalProfile = await this.spectatorModel.findByIdAndUpdate(
        spectator._id,
        { $inc: { pointBalance: -deltaPoints } }, // Trừ đi khoảng chênh lệch
        { returnDocument: 'after', session },
      );

      if (!finalProfile) {
        throw new BadRequestException('Lỗi cập nhật số dư tài khoản');
      }

      // Ghi log giao dịch điểm tương ứng với hành động
      if (deltaPoints > 0) {
        await this.pointsTransactionService.logTransaction({
          userId,
          type: PointsTransactionType.SPEND,
          amount: deltaPoints,
          balanceAfter: finalProfile.pointBalance,
          reason: `Cược thêm ${deltaPoints} điểm khi cập nhật đơn cược [${betId}]`,
        });
      } else if (deltaPoints < 0) {
        await this.pointsTransactionService.logTransaction({
          userId,
          type: PointsTransactionType.REFUND,
          amount: Math.abs(deltaPoints),
          balanceAfter: finalProfile.pointBalance,
          reason: `Hoàn lại ${Math.abs(deltaPoints)} điểm thừa khi cập nhật đơn cược [${betId}]`,
        });
      }

      // 2. CHUẨN HÓA SỐ LIỆU ĐÁM ĐÔNG & TÍNH ODDS:
      const isChangeHorse = this.resolveId(bet.horseId) !== dto.horseId;

      // Lấy số liệu thô hiện tại từ DB (Vẫn đang bao gồm đơn cược cũ của bạn)
      let totalBettors = await this.betRepository.countTotalBettorsInRace(
        this.resolveId(bet.raceId),
      );
      let horseBettors = await this.betRepository.countBettorsOnHorse(
        this.resolveId(bet.raceId),
        dto.horseId,
      );

      // ĐƯA SỐ LIỆU VỀ TRẠNG THÁI "CHƯA TỪNG CÓ BẠN"
      // Vì đơn cược cũ đã lưu trong DB, tổng số người thực tế của race (không tính bạn) phải trừ đi 1
      totalBettors = Math.max(totalBettors - 1, 0);

      if (!isChangeHorse) {
        // Nếu giữ nguyên ngựa cũ: Số người cược con này thực tế (không tính bạn) phải trừ đi 1
        horseBettors = Math.max(horseBettors - 1, 0);
      }
      // Nếu đổi sang ngựa mới: horseBettors bốc từ DB lên chính là số người cược thực tế của ngựa đó (chưa hề tính bạn)

      // TÁI ÁP DỤNG LƯỢT CƯỢC MỚI CỦA BẠN VÀO (+1)
      const finalTotalBettors = totalBettors + 1;
      const finalHorseBettors = horseBettors + 1;

      // Tính Odds chuẩn dựa trên cục diện mới
      const finalOdds = this.calculateOdds(
        horse.winRate || 0,
        finalTotalBettors,
        finalHorseBettors,
      );

      // 3. CẬP NHẬT ĐƠN CƯỢC VỚI THÔNG SỐ SẠCH
      const updatedBet = await this.betRepository.updateBet(
        betId,
        {
          horseId: new Types.ObjectId(dto.horseId),
          pointsWagered: dto.pointsWagered,
          horseWinRateAtBet: horse.winRate || 0,
          bettorsOnHorseAtBet: finalHorseBettors,
          totalBettorsAtBet: finalTotalBettors,
          finalOdds,
          isInsuranceCardUsed: isInsuranceApplied,
        },
        session,
      );

      if (!updatedBet) {
        throw new BadRequestException('Lỗi! Không thể cập nhật cá cược');
      }

      // 4. TẠO THÔNG BÁO THÀNH CÔNG
      await this.notificationRepository.create({
        userId: new Types.ObjectId(userId),
        type: NotificationTypeEnum.UPDATE_BET_SUCCESS,
        title: NotificationTitleEnum.UPDATE_BET_SUCCESS,
        content: `Cập nhật thành công đơn cược mã [${betId}]. Lựa chọn mới: Ngựa ${horse.name}, Điểm: ${dto.pointsWagered}`,
        isRead: false,
      });

      await session.commitTransaction();
      return this.toResponse(updatedBet.toObject());
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * HÀM XỬ LÝ TRẢ THƯỞNG KHI TRẬN ĐẤU KẾT THÚC
   */
  async processRaceBetSettlement(
    raceId: string,
    winnerHorseId: string,
  ): Promise<void> {
    const allBets = await this.betRepository.findAllPendingBetsByRaceId(raceId);
    if (!allBets || allBets.length === 0) return;

    for (const bet of allBets) {
      const isWinner = this.resolveId(bet.horseId) === winnerHorseId;
      const session = await this.connection.startSession();
      session.startTransaction();

      try {
        const specProfile = await this.spectatorModel.findById(bet.spectatorId);
        if (!specProfile) continue;

        // 1. Xác định số điểm thắng cược thực tế
        const pointsWon = isWinner
          ? Math.floor(bet.pointsWagered * bet.finalOdds)
          : 0;

        await this.betRepository.updateBet(
          this.resolveId(bet),
          {
            result: isWinner ? BetResultEnum.WIN : BetResultEnum.LOSE,
            pointsWon: pointsWon,
          },
          session,
        );

        // 2. Tính toán lại tỷ lệ thắng
        const totalWinBets = await this.betRepository['betModel']
          .countDocuments({
            spectatorId: specProfile._id,
            result: BetResultEnum.WIN,
          })
          .session(session);

        const totalBetsCount = specProfile.totalBets || 1;
        const computedWinRate =
          Math.round((totalWinBets / totalBetsCount) * 100 * 100) / 100;

        //Cập nhật điểm cho spectator thắng
        if (isWinner) {
          const updatedSpec = await this.spectatorModel.findByIdAndUpdate(
            bet.spectatorId,
            {
              $inc: { pointBalance: pointsWon, totalPoints: pointsWon },
              $set: { winRate: computedWinRate },
            },
            { returnDocument: 'after', session },
          );

          if (!updatedSpec)
            throw new BadRequestException(
              'Đã xảy ra lỗi! Không thể cập nhật cá cược',
            );

          await this.pointsTransactionService.logTransaction({
            userId: this.resolveId(specProfile.userId),
            type: PointsTransactionType.EARN,
            amount: pointsWon,
            balanceAfter: updatedSpec.pointBalance,
            reason: `Nhận điểm thưởng thắng cược vòng đua [${raceId}]. Ngựa về nhất: [${winnerHorseId}]`,
          });

          await this.notificationRepository.create({
            userId: specProfile.userId,
            type: NotificationTypeEnum.BET_WIN,
            title: NotificationTitleEnum.BET_WIN,
            content: `Chúc mừng bạn đã thắng cược! Bạn nhận được +${pointsWon} điểm từ việc đặt cược vào chiến mã thắng cuộc.`,
            isRead: false,
          });
        } else {
          // TRƯỜNG HỢP LOSE: KIỂM TRA ĐƠN CƯỢC CÓ DÙNG THẺ BẢO HIỂM HAY KHÔNG
          let currentBalance = specProfile.pointBalance;
          let insuranceContent = `Đơn cược của bạn tại vòng đua [${raceId}] đã không chuẩn xác. Chúc bạn may mắn hơn ở lần sau!`;

          if (bet.isInsuranceCardUsed) {
            const refundPoints = Math.floor(bet.pointsWagered * 0.5); // Hoàn lại 50% điểm cược
            currentBalance += refundPoints;

            // Hoàn tiền vào ví
            await this.spectatorModel.findByIdAndUpdate(
              bet.spectatorId,
              {
                $inc: { pointBalance: refundPoints },
                $set: { winRate: computedWinRate },
              },
              { session },
            );

            // Log giao dịch hoàn tiền bảo hiểm
            await this.pointsTransactionService.logTransaction({
              userId: this.resolveId(specProfile.userId),
              type: PointsTransactionType.REFUND, // Hoặc EARN tùy cấu hình hệ thống của bạn
              amount: refundPoints,
              balanceAfter: currentBalance,
              reason: `Hoàn lại 50% điểm cược do sử dụng thẻ bảo hiểm tại vòng đua [${raceId}]`,
            });

            insuranceContent = `Đơn cược tại vòng đua [${raceId}] đã không chuẩn xác. Tuy nhiên, bạn có sử dụng thẻ bảo hiểm kích hoạt nên đã được hoàn lại 50% số điểm cược (+${refundPoints} điểm) vào tài khoản.`;
          } else {
            // Thua thông thường không có bảo hiểm
            await this.spectatorModel.findByIdAndUpdate(
              bet.spectatorId,
              { $set: { winRate: computedWinRate } },
              { session },
            );
          }

          await this.notificationRepository.create({
            userId: specProfile.userId,
            type: NotificationTypeEnum.BET_LOSE,
            title: NotificationTitleEnum.BET_LOSE,
            content: insuranceContent,
            isRead: false,
          });
        }

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        if (err) throw new BadRequestException(err);
      } finally {
        session.endSession();
      }
    }
  }

  async refundBetsForDisqualifiedHorse(
    raceId: string,
    horseId: string, // Khớp định dạng ClientSession đồng bộ từ Service cha
  ): Promise<void> {
    // 1. Tìm toàn bộ các đơn cược PENDING của con ngựa này trong trận đấu
    const activeBets = await this.betRepository.findPendingBetsByRaceAndHorse(
      raceId,
      horseId,
    );

    for (const bet of activeBets) {
      // 2. Chuyển trạng thái đơn cược thành REFUNDED trong session
      await this.betRepository.updateBetResult(
        bet._id.toString(),
        BetResultEnum.REFUNDED,
      );

      // 3. Tìm hồ sơ Spectator để hoàn tiền
      const spectator = await this.spectatorModel.findById(bet.spectatorId);

      if (spectator) {
        // Tính toán lại WinRate ảo do tổng số đơn cược bị giảm đi 1
        const currentWinBets = await this.betRepository[
          'betModel'
        ].countDocuments({
          spectatorId: spectator._id,
          result: BetResultEnum.WIN,
        });

        const newTotalBets = Math.max(0, (spectator.totalBets || 0) - 1);
        const newWinRate =
          newTotalBets > 0
            ? Math.round((currentWinBets / newTotalBets) * 100 * 100) / 100
            : 0;

        // Hoàn trả 100% số điểm đã cược ban đầu vào ví
        await this.spectatorModel.findByIdAndUpdate(spectator._id, {
          $inc: { pointBalance: bet.pointsWagered, totalBets: -1 },
          $set: { winRate: newWinRate },
        });

        // 4. Khôi phục lại Thẻ bảo hiểm cược nếu Spectator có áp dụng trong đơn cược này
        if (bet.isInsuranceCardUsed) {
          // Tìm đúng 1 thẻ đã dùng (isUsed: true) của user này để hoàn trả lại kho
          const usedInsuranceClaim = await this.rewardRepository[
            'claimedRewardModel'
          ]
            .findOne({ userId: spectator.userId, isUsed: true })
            .populate('rewardId');

          // Lọc chính xác loại thẻ bảo hiểm để khôi phục trạng thái chưa sử dụng
          if (
            usedInsuranceClaim &&
            (usedInsuranceClaim.rewardId as any)?.rewardType ===
              RewardType.INSURANCE_CARD
          ) {
            await this.rewardRepository['claimedRewardModel'].findByIdAndUpdate(
              usedInsuranceClaim._id,
              { $set: { isUsed: false } },
            );
          }
        }

        // 5. Ghi nhận lịch sử giao dịch cộng điểm (Points Transaction)
        await this.pointsTransactionService.logTransaction({
          userId: spectator.userId.toString(),
          type: PointsTransactionType.REFUND,
          amount: bet.pointsWagered as number,
          balanceAfter: (spectator.pointBalance + bet.pointsWagered) as number,
          reason: `Hoàn trả 100% điểm cược trận đấu [${raceId}] do chiến mã bị hủy tư cách thi đấu`,
        });

        // 6. Gửi thông báo cho Spectator biết
        await this.notificationRepository.create({
          userId: spectator.userId,
          type: NotificationTypeEnum.REFUND,
          title: NotificationTitleEnum.REFUND,
          content: `Đơn cược ${bet.pointsWagered} điểm của bạn tại trận đấu [${raceId}] đã được hoàn trả thành công do ngựa đua gặp sự cố vi phạm kỹ thuật trước giờ khởi tranh.`,
          isRead: false,
        });
      }
    }
  }
}
