// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersRepository } from '../user/user.repository';
import { HashUtil } from 'src/utils/helpers';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';
import { LoginDto } from './dto/login.dto';

// Import toàn bộ các Profile Schema
import { JockeyProfile } from '../user/schemas/jockey-profile.schema';
import { SpectatorProfile } from '../user/schemas/spectator-profile.schema';
import { RefereeProfile } from '../user/schemas/referee-profile.schema';
import { HorseOwnerProfile } from '../user/schemas/horse-owner-profile.schema';
import { RegisterSpectatorDto } from '../user/dto/create-spectator.dto';
import { RegisterJockeyDto } from '../user/dto/create-jockey.dto';
import { RegisterRefereeDto } from '../user/dto/create-referee.dto';
import { RegisterHorseOwnerDto } from '../user/dto/create-horse-owner.dto';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';

type RegisterPayload =
  | RegisterSpectatorDto
  | RegisterJockeyDto
  | RegisterRefereeDto
  | RegisterHorseOwnerDto;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(JockeyProfile.name) private jockeyModel: Model<JockeyProfile>,
    @InjectModel(SpectatorProfile.name)
    private spectatorModel: Model<SpectatorProfile>,
    @InjectModel(RefereeProfile.name)
    private refereeModel: Model<RefereeProfile>,
    @InjectModel(HorseOwnerProfile.name)
    private horseOwnerModel: Model<HorseOwnerProfile>,
  ) {}

  // Luồng xử lý đăng ký đa vai trò tập trung
  async register(dto: RegisterPayload) {
    const existing = await this.userRepository.findOneUser({
      email: dto.email,
    });
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await HashUtil.hash(dto.password);

    // 1. Tạo User gốc (Mặc định để INACTIVE hoặc PENDING chờ admin duyệt nếu cần)
    const userPayload = {
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      phoneNumber: dto.phoneNumber,
      address: dto.address,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      role: dto.role,
      status: AccountStatusEnum.ACTIVE, // Tùy chọn trạng thái ban đầu của hệ thống
    };

    const savedUser = await this.userRepository.createUser(userPayload);

    // 2. Định tuyến tạo Profile phụ tương ứng dựa theo Role
    switch (dto.role) {
      case RoleEnum.SPECTATOR: {
        await this.spectatorModel.create({ userId: savedUser._id });
        break;
      }

      case RoleEnum.JOCKEY: {
        const jockeyDto = dto as RegisterJockeyDto;
        await this.jockeyModel.create({
          userId: savedUser._id,
          weight: jockeyDto.weight,
          height: jockeyDto.height,
          jockeyStatus: JockeyStatusEnum.PENDING_APPROVAL,
        });
        break;
      }

      case RoleEnum.REFEREE: {
        const refereeDto = dto as RegisterRefereeDto;
        await this.refereeModel.create({
          userId: savedUser._id,
          experienceYears: refereeDto.experienceYears,
          certification: refereeDto.certification,
        });
        break;
      }

      case RoleEnum.HORSE_OWNER: {
        const horseOwnerDto = dto as RegisterHorseOwnerDto;
        await this.horseOwnerModel.create({
          userId: savedUser._id,
          stableName: horseOwnerDto.stableName,
          stableAddress: horseOwnerDto.stableAddress,
        });
        break;
      }
    }

    return { message: 'Đăng ký tài khoản thành công!' };
  }

  // Luồng xử lý đăng nhập & cấp phát token JWT
  async login(dto: LoginDto) {
    const user = await this.userRepository.findOneUserWithPassword(dto.email);
    if (!user)
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');

    const isMatch = await HashUtil.compare(dto.password, user.password);
    if (!isMatch)
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessTokenTime = (this.configService.get<string>(
      'JWT_ACCESS_EXPIRES',
    ) || '3h') as StringValue;
    const refreshTokenTime = (this.configService.get<string>(
      'JWT_REFRESH_EXPIRES',
    ) || '7d') as StringValue;

    // Sinh cặp đôi token với thời gian sống khác nhau
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenTime,
    }); // Hết hạn nhanh
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTokenTime,
    }); // Hết hạn lâu

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
