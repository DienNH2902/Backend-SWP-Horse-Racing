import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './user.repository';
import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from './dto/response-user.dto';
import { HashUtil } from 'src/utils/helpers';
import { UpdateHorseOwnerDto } from './dto/update-horse-owner-profile.dto';
import { UpdateRefereeDto } from './dto/update-referee-profile.dto';
import { UpdateJockeyDto } from './dto/update-jockey-profile.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';
import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';
import { HorseRepository } from '../horse/horse.repository';
import { RawResultRepository } from '../raw-result/raw-result.repository';
import { AdjustPointsDto } from './dto/admin-adjust-points.dto';
import { AdjustReputationPointsDto } from './dto/admin-adjust-reputation.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly horseRepository: HorseRepository,
    private readonly rawResultRepository: RawResultRepository,
  ) {}

  private toResponse(data: any) {
    return plainToInstance(ResponseUserDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createUser(dto: CreateUserDto): Promise<ResponseUserDto> {
    const existing = await this.userRepository.findOneUser({
      email: dto.email,
    });
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await HashUtil.hash(dto.password);

    const user = await this.userRepository.createUser({
      ...dto,
      password: hashedPassword,
    });
    return this.toResponse(user);
  }

  async findAllUser(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.findAllUser();
    return users.map((u) => this.toResponse(u));
  }

  // async findAllUsersByRole(role: RoleEnum): Promise<ResponseUserDto[]> {
  //   const users = await this.userRepository.findAllUsersByRole(role);
  //   return users.map((u) => this.toResponse(u));
  // }

  async findAllUsersByRole(
    role: RoleEnum,
    jockeyStatus?: JockeyStatusEnum,
  ): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.findAllUsersByRole(
      role,
      jockeyStatus,
    );
    return users.map((u) => this.toResponse(u));
  }

  // async findOneUser(id: string): Promise<ResponseUserDto> {
  //   const user = await this.userRepository.findOneUser({ _id: id });
  //   if (!user) throw new NotFoundException('User not found');
  //   return this.toResponse(user);
  // }

  async findOneUser(id: string): Promise<ResponseUserDto> {
    const user: any = await this.userRepository.findOneUser({ _id: id });
    if (!user) throw new NotFoundException('User not found');

    const role = user.role?.toLowerCase();

    if (role === 'jockey' && user.jockeyProfile?._id) {
      user.historyRace = await this.rawResultRepository.findByJockeyId(
        user.jockeyProfile._id.toString(),
      );
    }

    if (role === 'horse owner' || role === 'horseowner') {
      const horses = await this.horseRepository.findAllMyHorse(id);
      const horseIds = horses.map((h: any) => h._id);
      user.historyRace =
        await this.rawResultRepository.findByHorseIds(horseIds);
    }

    return this.toResponse(user);
  }

  async searchUsersByName(fullName: string): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.searchUsersByFullName(
      fullName || '',
    );
    return users.map((u) => this.toResponse(u));
  }

  // async updateUser(id: string, dto: UpdateUserDto): Promise<ResponseUserDto> {
  //   const updated = await this.userRepository.findUserByIdAndUpdate(id, dto);
  //   if (!updated) throw new NotFoundException('User not found');
  //   return this.toResponse(updated);
  // }

  //1. Cập nhật cho Spectator
  async updateSpectator(
    id: string,
    dto: UpdateUserDto,
  ): Promise<ResponseUserDto> {
    const updatedUser = await this.userRepository.findUserByIdAndUpdate(
      id,
      dto,
    );
    if (!updatedUser) throw new NotFoundException('User not found');

    // Tìm lại toàn bộ để kèm populate đầy đủ
    const fullUser = await this.userRepository.findOneUser({ _id: id });
    return this.toResponse(fullUser);
  }

  // 2. Cập nhật cho Jockey
  async updateJockey(
    id: string,
    dto: UpdateJockeyDto,
  ): Promise<ResponseUserDto> {
    const { weight, height, ...userFields } = dto;

    // Cập nhật bảng User gốc
    const updatedUser = await this.userRepository.findUserByIdAndUpdate(
      id,
      userFields,
    );
    if (!updatedUser) throw new NotFoundException('User not found');

    // Cập nhật bảng Jockey Profile phụ
    if (weight !== undefined || height !== undefined) {
      await this.userRepository.updateJockeyProfile(id, { weight, height });
    }

    const fullUser = await this.userRepository.findOneUser({ _id: id });
    return this.toResponse(fullUser);
  }

  // 3. Cập nhật cho Referee
  async updateReferee(
    id: string,
    dto: UpdateRefereeDto,
  ): Promise<ResponseUserDto> {
    const { experienceYears, certification, ...userFields } = dto;

    const updatedUser = await this.userRepository.findUserByIdAndUpdate(
      id,
      userFields,
    );
    if (!updatedUser) throw new NotFoundException('User not found');

    if (experienceYears !== undefined || certification !== undefined) {
      await this.userRepository.updateRefereeProfile(id, {
        experienceYears,
        certification,
      });
    }

    const fullUser = await this.userRepository.findOneUser({ _id: id });
    return this.toResponse(fullUser);
  }

  // 4. Cập nhật cho Horse Owner
  async updateHorseOwner(
    id: string,
    dto: UpdateHorseOwnerDto,
  ): Promise<ResponseUserDto> {
    const { stableName, stableAddress, ...userFields } = dto;

    const updatedUser = await this.userRepository.findUserByIdAndUpdate(
      id,
      userFields,
    );
    if (!updatedUser) throw new NotFoundException('User not found');

    if (stableName !== undefined || stableAddress !== undefined) {
      await this.userRepository.updateHorseOwnerProfile(id, {
        stableName,
        stableAddress,
      });
    }

    const fullUser = await this.userRepository.findOneUser({ _id: id });
    return this.toResponse(fullUser);
  }

  async updateAccountStatus(
    id: string,
    accountStatus: AccountStatusEnum,
  ): Promise<ResponseUserDto> {
    const user = await this.userRepository.updateAccountStatus(
      id,
      accountStatus,
    );

    return this.toResponse(user);
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    // 1. Tìm thông tin user bằng ID để lấy email
    const userBasic = await this.userRepository.findOneUser({ _id: id });
    if (!userBasic) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    // Lấy bản ghi chứa password dựa vào email của user đó
    const userWithPass = await this.userRepository.findOneUserWithPassword(
      userBasic.email,
    );
    if (!userWithPass) {
      throw new NotFoundException(
        'Không tìm thấy thông tin xác thực của tài khoản',
      );
    }

    // 2. Kiểm tra đối chiếu mật khẩu cũ xem có chính xác không
    const isMatch = await HashUtil.compare(
      dto.oldPassword,
      userWithPass.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    // Kiểm tra xem mật khẩu mới có trùng lặp với mật khẩu cũ hay không (Phòng hờ tầng 2)
    const isSameAsOld = await HashUtil.compare(
      dto.newPassword,
      userWithPass.password,
    );
    if (isSameAsOld) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu hiện tại',
      );
    }

    // 3. Tiến hành băm mã hóa mật khẩu mới và lưu xuống cơ sở dữ liệu
    const newHashedPassword = await HashUtil.hash(dto.newPassword);
    await this.userRepository.updatePassword(id, newHashedPassword);

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getSpectatorProfileByUserId(userId: string) {
    const profile =
      await this.userRepository.findSpectatorProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy profile người xem này');
    }
    return profile;
  }

  async adjustPointBalance(userId: string, adjustPointsDto: AdjustPointsDto) {
    const { amount } = adjustPointsDto;

    const profile =
      await this.userRepository.findSpectatorProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy profile người xem này');
    }

    // Nếu là thao tác trừ điểm, kiểm tra xem số dư có đủ không
    if (amount < 0 && profile.pointBalance + amount < 0) {
      throw new BadRequestException(
        'Số dư pointBalance không đủ để thực hiện trừ điểm',
      );
    }

    const updatedProfile = await this.userRepository.updatePointBalance(
      userId,
      amount,
    );

    return {
      message: 'Cập nhật pointBalance thành công',
      data: updatedProfile,
    };
  }

  async adjustJockeyReputationPoints(
    userId: string,
    adjustReputationDto: AdjustReputationPointsDto,
  ) {
    const { amount } = adjustReputationDto;

    const profile = await this.userRepository.findJockeyProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException(
        'Không tìm thấy profile nài ngựa (Jockey) này',
      );
    }

    const newPoints = (profile.reputationPoints || 0) + amount;

    if (newPoints < 0 || newPoints > 100) {
      throw new BadRequestException(
        'Điểm uy tín sau khi cập nhật phải nằm trong khoảng từ 0 đến 100',
      );
    }

    const updatedProfile =
      await this.userRepository.updateJockeyReputationPoints(userId, amount);

    return {
      message: 'Cập nhật điểm uy tín Jockey thành công',
      data: updatedProfile,
    };
  }

  async adjustOwnerReputationPoints(
    userId: string,
    adjustReputationDto: AdjustReputationPointsDto,
  ) {
    const { amount } = adjustReputationDto;

    const profile =
      await this.userRepository.findHorseOwnerProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException(
        'Không tìm thấy profile chủ ngựa (Horse Owner) này',
      );
    }

    const newPoints = (profile.reputationPoints || 0) + amount;

    if (newPoints < 0 || newPoints > 100) {
      throw new BadRequestException(
        'Điểm uy tín sau khi cập nhật phải nằm trong khoảng từ 0 đến 100',
      );
    }

    const updatedProfile =
      await this.userRepository.updateOwnerReputationPoints(userId, amount);

    return {
      message: 'Cập nhật điểm uy tín Horse Owner thành công',
      data: updatedProfile,
    };
  }

  async getDashboardStatistics(): Promise<{
    totalUsers: number;
    roles: Record<string, number>;
    accountStatuses: Record<string, number>;
    jockeyStatuses: Record<string, number>;
  }> {
    const stats = await this.userRepository.getAdminDashboardStats();

    // Aggregate $facet luôn trả về mảng 1 phần tử
    const userAgg = stats.userStats[0];

    const roles = userAgg.byRole.reduce<Record<string, number>>((acc, curr) => {
      acc[String(curr._id)] = curr.count;
      return acc;
    }, {});

    const accountStatuses = userAgg.byStatus.reduce<Record<string, number>>(
      (acc, curr) => {
        acc[String(curr._id)] = curr.count;
        return acc;
      },
      {},
    );

    const jockeyStatuses = stats.jockeyStats.reduce<Record<string, number>>(
      (acc, curr) => {
        acc[String(curr._id)] = curr.count;
        return acc;
      },
      {},
    );

    return {
      totalUsers: userAgg.total[0]?.count || 0,
      roles,
      accountStatuses,
      jockeyStatuses,
    };
  }

  async removeUser(id: string): Promise<any> {
    return this.userRepository.deleteUser(id);
  }
}
