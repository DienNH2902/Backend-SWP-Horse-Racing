// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../user/user.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    // Kiểm tra nếu thiếu SECRET thì báo lỗi ngay lúc khởi động
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Kiểm tra hết hạn
      secretOrKey: jwtSecret, // dùng chìa khóa nào hết hạn để mở
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException(`Token không hợp lệ`);
    }
    // Payload nhận về sau khi giải mã token thành công
    const user = await this.userService.findOneUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'Token không hợp lệ hoặc tài khoản không tồn tại',
      );
    }
    return user; // Đối tượng trả về này sẽ được gán thẳng vào Request: req.user
  }
}
