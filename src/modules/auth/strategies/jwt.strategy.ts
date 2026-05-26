// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../user/user.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
// import { Request, Response } from 'express';
// import { StringValue } from 'ms';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
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
      // passReqToCallback: true, // Kích hoạt để lấy được đối tượng `req` và `res`
    });
  }

  async validate(payload: JwtPayload) {
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

  // async validate(req: Request, payload: JwtPayload) {
  //   const res = req.res as Response;
  //   const now = Math.floor(Date.now() / 1000);

  //   // Kiểm tra xem Access Token đã hết hạn chưa (vì ignoreExpiration: true nên payload.exp vẫn tồn tại)
  //   const isAccessTokenExpired = payload.exp ? payload.exp < now : true;

  //   if (isAccessTokenExpired) {
  //     const refreshToken = req.headers['x-refresh-token'];
  //     if (!refreshToken || typeof refreshToken !== 'string') {
  //       // Nếu hết hạn mà không có refresh token thì chặn ngay lập tức
  //       throw new UnauthorizedException(
  //         'Access token đã hết hạn và không có refresh token kèm theo',
  //       );
  //     }

  //     try {
  //       // 1. Giải mã và kiểm tra chữ ký của Refresh Token
  //       const decodedRefresh = this.jwtService.verify(refreshToken, {
  //         secret: this.configService.get<string>('JWT_SECRET'),
  //       }) as JwtPayload;

  //       // 2. TỐI GIẢN: Tìm xem user có tồn tại không (để lấy role/email mới nhất)
  //       // Không còn đoạn check: user.refreshToken !== refreshToken nữa
  //       const user = await this.userService.findOneUser(decodedRefresh.sub);
  //       if (!user) {
  //         throw new UnauthorizedException(
  //           'Tài khoản không tồn tại trên hệ thống',
  //         );
  //       }

  //       // 3. Ký và cấp phát Access Token mới
  //       const newPayload = {
  //         sub: user._id.toString(),
  //         email: user.email,
  //         role: user.role,
  //       };

  //       const accessTokenTime = (this.configService.get<string>(
  //         'JWT_ACCESS_EXPIRES',
  //       ) || '3h') as StringValue;
  //       const newAccessToken = this.jwtService.sign(newPayload, {
  //         expiresIn: accessTokenTime,
  //       });

  //       res.setHeader('x-new-access-token', newAccessToken);
  //       res.setHeader('Access-Control-Expose-Headers', 'x-new-access-token');

  //       return user;
  //     } catch {
  //       throw new UnauthorizedException(
  //         'Phiên đăng nhập đã hết hạn hoàn toàn, vui lòng đăng nhập lại',
  //       );
  //     }
  //   }

  //   const user = await this.userService.findOneUser(payload.sub);
  //   if (!user) {
  //     throw new UnauthorizedException('Tài khoản không tồn tại trên hệ thống');
  //   }
  //   return user;
  // }
}
