import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
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

type PopulatedJockeyProfile = User & {
  jockeyProfile?: { jockeyStatus: JockeyStatusEnum };
};
@Injectable()
export class JockeyInvitationService {
  constructor(
    private readonly jockeyInvitationRepository: JockeyInvitationRepository,
    private readonly contractRepository: ContractRepository,
    private readonly horseRepository: HorseRepository,
    private readonly userRepository: UsersRepository,
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
    // Validate: tổng shareRate phải = 100%
    if (dto.proposeOwnerShareRate + dto.proposeJockeyShareRate !== 100) {
      throw new BadRequestException(
        'Tổng proposeOwnerShareRate và proposeJockeyShareRate phải bằng 100',
      );
    }

    // Validate: tổng compensationRate phải = 100%
    if (dto.ownerCompensationRate + dto.jockeyCompensationRate !== 100) {
      throw new BadRequestException(
        'Tổng ownerCompensationRate và jockeyCompensationRate phải bằng 100',
      );
    }

    // Kiểm tra xem ngựa được đăng ký có thuộc chủ ngựa đó hay không
    const horse = await this.horseRepository.findOneHorse({ _id: dto.horseId });
    if (!horse) throw new NotFoundException('Horse not found');
    // Lấy ra chuỗi ID chuẩn từ object userId đã được populate
    const ownerIdStr =
      horse.userId?._id?.toString() || horse.userId?.toString();

    if (ownerIdStr !== horseOwnerId) {
      throw new ForbiddenException('Bạn không có quyền sử dụng con ngựa này');
    }

    // Kiểm tra xem ngựa này có IDLE hay không
    if (horse.horseStatus !== HorseStatusEnum.IDLE) {
      throw new ForbiddenException(
        `Không thể sử dụng ngựa ở trạng thái ${horse.horseStatus}`,
      );
    }

    const jockey = (await this.userRepository.findOneUser({
      _id: dto.jockeyId,
    })) as PopulatedJockeyProfile;
    if (!jockey) throw new NotFoundException('Không tìm thấy Jockey');

    if (jockey.status !== AccountStatusEnum.ACTIVE)
      throw new BadRequestException(
        `Trạng thái Jockey này đang: ${jockey.status}, không thể mời`,
      );

    if (jockey.jockeyProfile?.jockeyStatus !== JockeyStatusEnum.AVAILABLE)
      throw new BadRequestException(
        `Trạng thái hồ sơ Jockey này đang: ${jockey.jockeyProfile?.jockeyStatus}, không thể mời`,
      );

    // Kiểm tra xem nài ngựa này đã ký hợp đồng với chủ ngựa khác chưa
    const jockeyHasContractInTournament =
      await this.contractRepository.findActiveContractByJockeyAndTournament(
        dto.tournamentId,
        dto.jockeyId,
      );

    if (jockeyHasContractInTournament) {
      throw new ConflictException(
        'Nài ngựa này đã ký hợp đồng tham gia giải đấu này rồi, không thể gửi thêm lời mời.',
      );
    }
    // Validate: chưa có thư mời PENDING nào cho bộ (tournament, horse, jockey) này
    const existingPending = await this.jockeyInvitationRepository.findPending(
      dto.tournamentId,
      dto.horseId,
      dto.jockeyId,
    );
    if (existingPending) {
      throw new ConflictException(
        'Đã tồn tại một lời mời đang chờ phản hồi cho cặp jockey-ngựa này trong giải đấu. ' +
          'Vui lòng chờ jockey phản hồi hoặc hết hạn trước khi gửi lại.',
      );
    }

    // Validate: Cặp này chưa hề ký hợp đồng ACTIVE nào (Tránh mời lại khi đã chốt kèo)
    // const existingActiveContract =
    //   await this.contractRepository.findActiveContract(
    //     dto.tournamentId,
    //     dto.horseId,
    //     dto.jockeyId,
    //   );
    // if (existingActiveContract) {
    //   throw new ConflictException(
    //     'Nài ngựa này đã ký hợp đồng chính thức cưỡi con ngựa được chọn tại giải đấu này rồi.',
    //   );
    // }

    // Validate: jockey chưa có contract ACTIVE cho cặp này (tránh mời jockey đã ký)
    // Note: thêm check này nếu muốn ngăn trường hợp mời jockey đã ký hợp đồng
    // const existing = await this.contractRepository.findByInvitationId(...);

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
      await this.jockeyInvitationRepository.findByIdForContract(invitationId);

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    // Chỉ jockey được chỉ định mới có thể phản hồi
    if (this.resolveId(invitation.jockeyId) !== jockeyId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi lời mời này');
    }

    // Chỉ phản hồi được khi status = PENDING
    if (invitation.status !== JockeyInvitationEnum.PENDING) {
      throw new ConflictException(
        `Lời mời này đã ở trạng thái "${invitation.status}", không thể phản hồi`,
      );
    }

    // Cập nhật status invitation
    const updated = await this.jockeyInvitationRepository.updateStatus(
      invitationId,
      dto.status,
    );

    const invitationResponse = this.toInvitationResponse(updated);

    // Nếu status ACCEPTED → tự động tạo Contract
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

    const jockeyIdStr = this.resolveId(invitation.jockeyId);
    const ownerIdStr = this.resolveId(invitation.horseOwnerId);

    // Chỉ jockey hoặc horseOwner liên quan mới được xem
    if (requesterId !== jockeyIdStr && requesterId !== ownerIdStr) {
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

    const jockeyIdStr = this.resolveId(invitation.jockeyId);
    const ownerIdStr = this.resolveId(invitation.horseOwnerId);

    if (requesterId !== jockeyIdStr && requesterId !== ownerIdStr) {
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
}
