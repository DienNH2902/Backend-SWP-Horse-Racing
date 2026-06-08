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

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UsersRepository) {}

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

  async findAllUsersByRole(role: RoleEnum): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.findAllUsersByRole(role);
    return users.map((u) => this.toResponse(u));
  }

  async findOneUser(id: string): Promise<ResponseUserDto> {
    const user = await this.userRepository.findOneUser({ _id: id });
    if (!user) throw new NotFoundException('User not found');
    return this.toResponse(user);
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

  async removeUser(id: string): Promise<any> {
    return this.userRepository.deleteUser(id);
  }
}
