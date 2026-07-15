import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model, Types } from 'mongoose';
import { JockeyInvitationRepository } from './invitation.repository';
import { ContractRepository } from './contract.repository';
import { ContractStatusEnum } from 'src/constants/contractStatusEnum.enum';
import {
  CreateJockeyInvitationDto,
  RespondJockeyInvitationDto,
  ResponseJockeyInvitationDto,
  ResponseContractDto,
} from './dto';
import { JockeyInvitationEnum } from 'src/constants/jockeyInvitationEnum.enum';
import { HorseRepository } from '../horse/horse.repository';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';
import { UsersRepository } from '../user/user.repository';
import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';
import { User } from '../user/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  HorseOwnerProfile,
  HorseOwnerProfileDocument,
} from '../user/schemas/horse-owner-profile.schema';
import { JockeyProfile } from '../user/schemas/jockey-profile.schema';
import { NotificationRepository } from '../notification/notification.repository';
import { TransactionRepository } from '../payment/transaction.repository';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { FilterContractDto } from './dto/filter-contract.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';

type PopulatedJockeyProfile = User & {
  jockeyProfile?: { jockeyStatus: JockeyStatusEnum };
};
@Injectable()
export class JockeyInvitationService {
  constructor(
    private readonly jockeyInvitationRepository: JockeyInvitationRepository,
    private readonly contractRepository: ContractRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly horseRepository: HorseRepository,
    private readonly userRepository: UsersRepository,
    @InjectModel(HorseOwnerProfile.name)
    private readonly horseOwnerProfileModel: Model<HorseOwnerProfileDocument>,
    @InjectModel(JockeyProfile.name)
    private readonly jockeyProfileModel: Model<JockeyProfile>,
  ) {}

  // Helper
  private toInvitationResponse(data: any): ResponseJockeyInvitationDto {
    return plainToInstance(ResponseJockeyInvitationDto, data, {
      excludeExtraneousValues: true,
    });
  }

  private toContractResponse(data: any): ResponseContractDto {
    return plainToInstance(ResponseContractDto, data, {
      excludeExtraneousValues: true,
    });
  }

  // Lấy ownerIdStr an toàn bất kể trường đã populate hay chưa

  private resolveId(field: any): string {
    return field?._id?.toString() || field?.toString();
  }

  // HorseOwner gửi invitation

  async sendInvitation(
    dto: CreateJockeyInvitationDto,
    horseOwnerId: string,
  ): Promise<ResponseJockeyInvitationDto> {
    //Tổng tỉ lệ chia sẻ thưởng phải bằng 100
    if (dto.proposeOwnerShareRate + dto.proposeJockeyShareRate !== 100) {
      throw new BadRequestException(
        'Tổng tỷ lệ chia sẻ doanh thu phải bằng 100%',
      );
    }
    //Tổng tỉ lệ đền bù phải bằng 100
    if (dto.ownerCompensationRate + dto.jockeyCompensationRate !== 100) {
      throw new BadRequestException('Tổng tỷ lệ đền bù cam kết phải bằng 100%');
    }

    // Tính toán tổng số tiền chủ ngựa cần có để ký quỹ ban đầu (Tiền thuê + Tiền đền bù của mình)
    // Tiền bổi thường = contractAmount * %đền bù
    const ownerCompensationAmount =
      (dto.proposeContractAmount * dto.ownerCompensationRate) / 100;
    // Tiền đóng băng = contractAmount + tiền bồi thường
    const totalRequiredAmount =
      dto.proposeContractAmount + ownerCompensationAmount;

    // Kiểm tra ví chủ ngựa
    const ownerProfile = await this.horseOwnerProfileModel
      .findOne({ userId: new Types.ObjectId(horseOwnerId) })
      .lean();
    if (!ownerProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ chủ ngựa');
    }
    if (ownerProfile.balance < totalRequiredAmount) {
      throw new BadRequestException(
        `Số dư không đủ để gửi lời mời. Bạn cần bảo đảm tối thiểu ${totalRequiredAmount} (Bao gồm tiền thuê: ${dto.proposeContractAmount} và tiền bảo ký quỹ đền bù: ${ownerCompensationAmount})`,
      );
    }

    //Kiểm tra ngựa trong hợp đồng có hợp lệ không
    const horse = await this.horseRepository.findOneHorse({ _id: dto.horseId });
    if (!horse) throw new NotFoundException('Không tìm thấy ngựa thi đấu');

    const ownerIdStr = this.resolveId(horse.userId);
    if (ownerIdStr !== horseOwnerId) {
      throw new ForbiddenException('Bạn không có quyền sử dụng con ngựa này');
    }
    if (horse.horseStatus !== HorseStatusEnum.IDLE) {
      throw new ForbiddenException(
        `Không thể sử dụng ngựa ở trạng thái ${horse.horseStatus}`,
      );
    }

    const jockey = (await this.userRepository.findOneUser({
      _id: dto.jockeyId,
    })) as PopulatedJockeyProfile;
    if (!jockey)
      throw new NotFoundException('Không tìm thấy thông tin nài ngựa');
    if (jockey.status !== AccountStatusEnum.ACTIVE) {
      throw new BadRequestException(
        'Tài khoản nài ngựa hiện đang bị khóa hoặc không hoạt động',
      );
    }
    if (jockey.jockeyProfile?.jockeyStatus !== JockeyStatusEnum.AVAILABLE) {
      throw new BadRequestException(
        'Nài ngựa hiện đang bận hoặc chưa sẵn sàng nhận lịch',
      );
    }

    //Kiểm tra Jockey này có hợp đồng nào active cho giải này hay không
    const jockeyHasContractInTournament =
      await this.contractRepository.findActiveContractByJockeyAndTournament(
        dto.tournamentId,
        dto.jockeyId,
      );
    if (jockeyHasContractInTournament) {
      throw new ConflictException(
        'Nài ngựa này đã chốt hợp đồng hoạt động khác trong giải đấu này',
      );
    }

    //Kiểm tra xem đang có lời mời nào đang pending cho giải này không, tránh chủ ngựa spam lời mời
    const existingPending = await this.jockeyInvitationRepository.findPending(
      dto.tournamentId,
      dto.horseId,
      dto.jockeyId,
    );
    if (existingPending) {
      throw new ConflictException(
        'Đã tồn tại một lời mời đang chờ phản hồi cho cặp đối tác này',
      );
    }

    // THỰC HIỆN HOLD TIỀN OWNER: Chuyển tiền từ balance sang heldBalance
    await this.horseOwnerProfileModel.updateOne(
      { userId: new Types.ObjectId(horseOwnerId) },
      {
        $inc: {
          balance: -totalRequiredAmount,
          heldBalance: totalRequiredAmount,
        },
      },
    );

    // 2. Tạo Transaction ghi nhận đóng băng tài sản của Owner
    await this.transactionRepository.create({
      senderId: new Types.ObjectId(horseOwnerId),
      receiverId: null,
      content: `Đóng băng tiền gửi lời mời Jockey (Tiền thuê: ${dto.proposeContractAmount}, Ký quỹ đền bù: ${ownerCompensationAmount})`,
      amount: totalRequiredAmount,
      type: TransactionTypeEnum.HOLD_BALANCE, // Đảm bảo enum này tồn tại hoặc map đúng giá trị hệ thống
    });

    const invitation = await this.jockeyInvitationRepository.create({
      tournamentId: new Types.ObjectId(dto.tournamentId),
      horseOwnerId: new Types.ObjectId(horseOwnerId),
      horseId: new Types.ObjectId(dto.horseId),
      jockeyId: new Types.ObjectId(dto.jockeyId),
      proposeContractAmount: dto.proposeContractAmount,
      proposeOwnerShareRate: dto.proposeOwnerShareRate,
      proposeJockeyShareRate: dto.proposeJockeyShareRate,
      ownerCompensationRate: dto.ownerCompensationRate,
      jockeyCompensationRate: dto.jockeyCompensationRate,
      message: dto.message,
      invitedAt: new Date(),
    });

    // 3. Bắn Notification cho Jockey biết có lời mời mới gửi đến
    await this.notificationRepository.create({
      userId: new Types.ObjectId(dto.jockeyId),
      type: NotificationTypeEnum.INVITATION_RECEIVED,
      title: NotificationTitleEnum.INVITATION_RECEIVED,
      content: `Bạn nhận được lời mời tham gia giải đấu từ Chủ ngựa. Tiền thuê đề xuất: ${dto.proposeContractAmount}`,
      isRead: false,
    });

    return this.toInvitationResponse(invitation);
  }

  // Jockey xem các lời mời gửi đến
  async getMyInvitations(
    jockeyId: string,
  ): Promise<ResponseJockeyInvitationDto[]> {
    const invitations =
      await this.jockeyInvitationRepository.findByJockeyId(jockeyId);
    return invitations.map((i) => this.toInvitationResponse(i));
  }

  // HorseOwner xem các lời mời đã gửi

  async getSentInvitations(
    horseOwnerId: string,
  ): Promise<ResponseJockeyInvitationDto[]> {
    const invitations =
      await this.jockeyInvitationRepository.findByHorseOwnerId(horseOwnerId);
    return invitations.map((i) => this.toInvitationResponse(i));
  }

  // Jockey phản hồi (accept / reject)
  async respondToInvitation(
    invitationId: string,
    dto: RespondJockeyInvitationDto,
    jockeyId: string,
  ): Promise<{
    invitation: ResponseJockeyInvitationDto;
    contract?: ResponseContractDto;
  }> {
    const invitation =
      await this.jockeyInvitationRepository.findByIdNoPopulate(invitationId);
    if (!invitation) throw new NotFoundException('Không tìm thấy lời mời');
    if (this.resolveId(invitation.jockeyId) !== jockeyId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi lời mời này');
    }
    //Kiểm tra xem lúc accept thì status lời mời có phải pending không
    if (invitation.status !== JockeyInvitationEnum.PENDING) {
      throw new ConflictException(
        `Lời mời đã đóng ở trạng thái: ${invitation.status}`,
      );
    }

    const ownerCompensationAmount =
      (invitation.proposeContractAmount * invitation.ownerCompensationRate) /
      100;
    const totalOwnerHeldAmount =
      invitation.proposeContractAmount + ownerCompensationAmount;
    const jockeyCompensationAmount =
      (invitation.proposeContractAmount * invitation.jockeyCompensationRate) /
      100;

    const horseIdStr = this.resolveId(invitation.horseId);

    // Xử lý kịch bản ACCEPTED (Chấp nhận giao kèo)
    if (dto.status === JockeyInvitationEnum.ACCEPTED) {
      const hasContract =
        await this.contractRepository.findActiveContractByJockeyAndTournament(
          invitation.tournamentId.toString(),
          jockeyId,
        );
      //Nếu có hợp active rồi thì không được accept
      if (hasContract) {
        // Hoàn tiền cho chủ ngựa vì giao kèo bị hủy do lỗi bên phía đối tác
        await this.horseOwnerProfileModel.updateOne(
          { userId: invitation.horseOwnerId },
          {
            $inc: {
              balance: totalOwnerHeldAmount,
              heldBalance: -totalOwnerHeldAmount,
            },
          },
        );

        await this.transactionRepository.create({
          senderId: null,
          receiverId: invitation.horseOwnerId,
          content: `Hoàn trả tiền giải phóng ký quỹ (Lời mời tự động hủy do Jockey đã có hợp đồng khác). Số tiền: ${totalOwnerHeldAmount}`,
          amount: totalOwnerHeldAmount,
          type: TransactionTypeEnum.REFUND,
        });

        await this.notificationRepository.create({
          userId: invitation.horseOwnerId,
          type: NotificationTypeEnum.INVITATION_REJECTED,
          title: NotificationTitleEnum.INVITATION_REJECTED,
          content: `Lời mời gửi tới Jockey đã bị hệ thống hủy bỏ do đối tác đã chốt hợp đồng thi đấu khác trong giải này. Tiền ký quỹ đã được hoàn về ví khả dụng.`,
          isRead: false,
        });

        await this.jockeyInvitationRepository.updateStatus(
          invitationId,
          JockeyInvitationEnum.REJECTED,
        );

        throw new ConflictException(
          'Bạn đã sở hữu hợp đồng thi đấu ACTIVE khác trong giải này',
        );
      }

      // KIỂM TRA VÀ HOLD TIỀN JOCKEY
      const jockeyProfile = await this.jockeyProfileModel.findOne({
        userId: new Types.ObjectId(jockeyId),
      });
      if (!jockeyProfile || jockeyProfile.balance < jockeyCompensationAmount) {
        throw new BadRequestException(
          `Số dư tài khoản nài ngựa không đủ ký quỹ đền bù cam kết. Yêu cầu tối thiểu: ${jockeyCompensationAmount}`,
        );
      }

      // Trừ tiền balance, đưa vào ngăn đóng băng của Jockey
      await this.jockeyProfileModel.updateOne(
        { userId: new Types.ObjectId(jockeyId) },
        {
          $inc: {
            balance: -jockeyCompensationAmount,
            heldBalance: jockeyCompensationAmount,
          },
        },
      );

      // 2. Tạo Transaction ghi nhận đóng băng tiền đền bù của Jockey
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(jockeyId),
        receiverId: null,
        content: `Đóng băng ký quỹ đền bù khi chấp nhận lời mời từ Owner. Số tiền: ${jockeyCompensationAmount}`,
        amount: jockeyCompensationAmount,
        type: TransactionTypeEnum.HOLD_BALANCE,
      });

      // 3. Bắn Notification thông báo cho Owner biết Jockey đã chấp nhận ký hợp đồng
      await this.notificationRepository.create({
        userId: invitation.horseOwnerId,
        type: NotificationTypeEnum.INVITATION_ACCEPTED,
        title: NotificationTitleEnum.INVITATION_ACCEPTED,
        content:
          'Jockey đã chấp nhận lời mời và ký quỹ đền bù thành công. Hợp đồng chính thức có hiệu lực.',
        isRead: false,
      });
    }

    // Xử lý kịch bản REJECTED (Từ chối lời mời)
    else if (dto.status === JockeyInvitationEnum.REJECTED) {
      // GIẢI PHÓNG TIỀN CHO OWNER khi bị từ chối thẳng
      await this.horseOwnerProfileModel.updateOne(
        { userId: invitation.horseOwnerId },
        {
          $inc: {
            balance: totalOwnerHeldAmount,
            heldBalance: -totalOwnerHeldAmount,
          },
        },
      );

      // 2. Tạo Transaction ghi nhận hoàn trả giải phóng tiền cho Owner
      await this.transactionRepository.create({
        senderId: null,
        receiverId: invitation.horseOwnerId,
        content: `Hoàn trả tiền giải phóng ký quỹ do lời mời bị từ chối hoặc hết hạn. Số tiền: ${totalOwnerHeldAmount}`,
        amount: totalOwnerHeldAmount,
        type: TransactionTypeEnum.REFUND,
      });

      // 3. Bắn Notification cho Owner biết lời mời bị từ chối
      await this.notificationRepository.create({
        userId: invitation.horseOwnerId,
        type: NotificationTypeEnum.INVITATION_REJECTED,
        title: NotificationTitleEnum.INVITATION_REJECTED,
        content:
          'Jockey đã từ chối lời mời hợp tác của bạn. Tiền ký quỹ đã được hoàn về ví khả dụng.',
        isRead: false,
      });

      // 4. Đổi trạng thái ngựa về lại IDLE nếu Jockey từ chối
      await this.horseRepository.updateHorseStatus(
        horseIdStr,
        HorseStatusEnum.IDLE,
      );
    }

    const updated = await this.jockeyInvitationRepository.updateStatus(
      invitationId,
      dto.status,
    );
    const invitationResponse = this.toInvitationResponse(updated);

    //Tự động tạo hợp đồng nếu đồng y lời mời
    if (dto.status === JockeyInvitationEnum.ACCEPTED) {
      const contract = await this.contractRepository.create({
        tournamentId: invitation.tournamentId,
        horseOwnerId: invitation.horseOwnerId,
        horseId: invitation.horseId,
        jockeyId: invitation.jockeyId,
        jockeyInvitationId: new Types.ObjectId(invitationId),
        contractAmount: invitation.proposeContractAmount,
        ownerShareRate: invitation.proposeOwnerShareRate,
        jockeyShareRate: invitation.proposeJockeyShareRate,
        ownerCompensationRate: invitation.ownerCompensationRate,
        jockeyCompensationRate: invitation.jockeyCompensationRate,
        status: ContractStatusEnum.ACTIVE,
        signedAt: new Date(),
      });

      // Đổi trạng thái ngựa sang REGISTERED sau khi hợp đồng kích hoạt thành công
      // const horseIdStr = this.resolveId(invitation.horseId);
      await this.horseRepository.updateHorseStatus(
        horseIdStr,
        HorseStatusEnum.REGISTERED,
      );

      return {
        invitation: invitationResponse,
        contract: this.toContractResponse(contract),
      };
    }

    return { invitation: invitationResponse };
  }

  // Xem chi tiết invitation

  async getInvitationById(
    invitationId: string,
    requesterId: string,
  ): Promise<ResponseJockeyInvitationDto> {
    const invitation =
      await this.jockeyInvitationRepository.findById(invitationId);
    if (!invitation) throw new NotFoundException('Không tìm thấy lời mời');

    const isAdmin = await this.userRepository.findOneUser(
      new Types.ObjectId(requesterId),
    );

    if (!isAdmin)
      throw new BadRequestException('Không tìm thấy người dùng để xem role');

    const jockeyIdStr = this.resolveId(invitation.jockeyId);
    const ownerIdStr = this.resolveId(invitation.horseOwnerId);

    // Chỉ jockey hoặc horseOwner liên quan mới được xem
    if (
      requesterId !== jockeyIdStr &&
      requesterId !== ownerIdStr &&
      isAdmin.role !== RoleEnum.ADMIN
    ) {
      throw new ForbiddenException('Bạn không có quyền xem lời mời này');
    }

    return this.toInvitationResponse(invitation);
  }

  // Xem contract theo invitation

  async getContractByInvitation(
    invitationId: string,
    requesterId: string,
  ): Promise<ResponseContractDto> {
    const invitation =
      await this.jockeyInvitationRepository.findById(invitationId);
    if (!invitation) throw new NotFoundException('Không tìm thấy lời mời');

    const isAdmin = await this.userRepository.findOneUser(
      new Types.ObjectId(requesterId),
    );

    if (!isAdmin)
      throw new BadRequestException('Không tìm thấy người dùng để xem role');

    const jockeyIdStr = this.resolveId(invitation.jockeyId);
    const ownerIdStr = this.resolveId(invitation.horseOwnerId);

    if (
      requesterId !== jockeyIdStr &&
      requesterId !== ownerIdStr &&
      isAdmin.role !== RoleEnum.ADMIN
    ) {
      throw new ForbiddenException('Bạn không có quyền xem hợp đồng này');
    }

    const contract =
      await this.contractRepository.findByInvitationId(invitationId);
    if (!contract) {
      throw new NotFoundException(
        'Chưa có hợp đồng nào được tạo từ lời mời này',
      );
    }

    return this.toContractResponse(contract);
  }

  async getAllContracts(
    filterDto: FilterContractDto,
  ): Promise<ResponseContractDto[]> {
    const contracts = await this.contractRepository.getAllContracts(filterDto);
    return contracts.map((c) => this.toContractResponse(c));
  }
}
