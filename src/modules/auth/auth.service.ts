import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
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
import { ResponseUserDto } from '../user/dto/response-user.dto';
import { plainToInstance } from 'class-transformer';
import { MailService } from '../mail/mail.service';

type RegisterPayload =
  | RegisterSpectatorDto
  | RegisterJockeyDto
  | RegisterRefereeDto
  | RegisterHorseOwnerDto;

interface JwtPayload {
  sub: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatar: string;
  address: string;
  dateOfBirth: Date;
  status: string;
  role: string;
  gender: number;
}

interface GoogleUserPayload {
  email: string;
  name: string;
  avatar: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly mailService: MailService,
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
      // fullName: dto.fullName,
      // email: dto.email,
      // phoneNumber: dto.phoneNumber,
      // address: dto.address,
      // dateOfBirth: dto.dateOfBirth,
      // gender: dto.gender,
      // role: dto.role,
      ...dto,
      password: hashedPassword,
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

    this.mailService
      .sendWelcomeEmail(savedUser.email, savedUser.fullName)
      .catch((err) => {
        console.error(
          `[AuthService] Thất bại khi gửi email chào mừng đến ${savedUser.email}:`,
          err,
        );
      });

    return { message: 'Đăng ký tài khoản thành công!' };
  }

  // Luồng xử lý đăng nhập & cấp phát token JWT
  async login(dto: LoginDto): Promise<string> {
    const user = await this.userRepository.findOneUserWithPassword(dto.email);
    if (!user)
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');

    const isMatch = await HashUtil.compare(dto.password, user.password);
    if (!isMatch)
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');

    const payload: JwtPayload = {
      sub: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
      status: user.status,
      role: user.role,
      gender: user.gender,
    };

    return this.generateToken(payload);
  }

  private generateToken(payload: JwtPayload): string {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const expiresTime = (this.configService.get<string>('JWT_ACCESS_EXPIRES') ||
      '7d') as StringValue;

    return this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: expiresTime,
    });
  }

  // loginWithGoogle(googleUser: GoogleUserPayload | undefined) {
  //   if (!googleUser) {
  //     return { message: 'No user from google' };
  //   }

  //   // Giả sử lấy được thông tin user từ DB bao gồm id và role:
  //   const internalUser = {
  //     id: 'user_uuid_123',
  //     email: googleUser.email, // ESLint đã biết chắc chắn đây là string, không còn là any
  //     role: 'USER',
  //   };

  //   const payload = {
  //     sub: internalUser.id,
  //     email: internalUser.email,
  //     role: internalUser.role,
  //   };

  //   return {
  //     access_token: this.jwtService.sign(payload),
  //   };
  // }

  // Luồng xử lý đăng nhập bằng Google OAuth2 công phá trực tiếp vào DB
  async loginWithGoogle(
    googleUser: GoogleUserPayload | undefined,
  ): Promise<string> {
    if (!googleUser) {
      throw new UnauthorizedException('Không có dữ liệu người dùng từ Google');
    }

    // 1. Tìm xem email từ Google đã tồn tại trong hệ thống chưa
    let user = await this.userRepository.findOneUser({
      email: googleUser.email,
    });

    // 2. Nếu chưa tồn tại (Người dùng lần đầu đăng nhập hệ thống qua Google) -> Tự động đăng ký
    if (!user) {
      // Tạo một chuỗi mật khẩu ngẫu nhiên ngầm vì Schema bắt buộc phải có password
      const randomPassword =
        Math.random().toString(36).slice(-10) + Date.now().toString();
      const hashedPassword = await HashUtil.hash(randomPassword);

      const userPayload = {
        fullName: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.avatar,
        role: RoleEnum.SPECTATOR,
        status: AccountStatusEnum.ACTIVE,
        password: hashedPassword, // Bổ sung password đã băm để vượt qua validation của Mongoose
      };

      // Lưu User gốc vào MongoDB thông qua Repository
      user = await this.userRepository.createUser(userPayload);

      if (!user) {
        throw new InternalServerErrorException(
          'Không thể khởi tạo tài khoản hệ thống',
        );
      }

      // Tạo Profile phụ tương ứng (Spectator) để đồng bộ cấu trúc hệ thống
      await this.spectatorModel.create({ userId: user._id });

      const { email, fullName } = user;
      this.mailService.sendWelcomeEmail(email, fullName).catch((err) => {
        console.error(
          `[AuthService] Thất bại khi gửi email Google Welcome đến ${email}:`,
          err,
        );
      });

      this.mailService
        .sendGeneratedPasswordEmail(email, fullName, randomPassword)
        .catch((err) => {
          console.error(
            `[AuthService] Thất bại khi gửi thông báo cấp mật khẩu Google cho ${email}:`,
            err,
          );
        });
    }

    // 3. Đóng gói payload theo đúng cấu trúc định dạng JwtPayload của hệ thống bạn
    const payload: JwtPayload = {
      sub: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
      status: user.status,
      gender: user.gender || 0, // Fallback giá trị mặc định nếu user mới tạo chưa có giới tính
    };

    // 4. Ký và trả về chuỗi JWT token chuẩn của hệ thống
    return this.generateToken(payload);
  }

  getProfile(user: any): ResponseUserDto {
    return plainToInstance(ResponseUserDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
