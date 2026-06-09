import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  // ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterSpectatorDto } from '../user/dto/create-spectator.dto';
import { RegisterJockeyDto } from '../user/dto/create-jockey.dto';
import { RegisterRefereeDto } from '../user/dto/create-referee.dto';
import { RegisterHorseOwnerDto } from '../user/dto/create-horse-owner.dto';
import { ResponseUserDto } from '../user/dto/response-user.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

// type RegisterPayload = RegisterSpectatorDto &
//   RegisterJockeyDto &
//   RegisterRefereeDto &
//   RegisterHorseOwnerDto;

@ApiTags('Auth & Profile')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập hệ thống bằng email và password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // @Get('google')
  // @UseGuards(AuthGuard('google'))
  // async googleAuth(@Request() req) {}

  // // Link Google gọi về sau khi user đăng nhập thành công
  // @Get('google/callback')
  // @UseGuards(AuthGuard('google'))
  // async googleAuthRedirect(@Request() req, @Response() res) {
  //   // Gọi service để xử lý dữ liệu và tạo JWT format của riêng BE
  //   const result = await this.authService.loginWithGoogle(req.user);

  //   // Trả JWT về cho Client. Cách đơn giản nhất là chuyển hướng kèm token trên URL,
  //   // hoặc bạn có thể render ra JSON tùy cấu trúc dự án.
  //   return res.redirect(
  //     `http://localhost:5173/oauth-success?token=${result.access_token}`,
  //   );
  // }

  // Link kích hoạt đăng nhập từ trình duyệt: http://localhost:3000/auth/google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Luồng Passport tự động chuyển hướng sang trang đăng nhập của Google
  }

  // Đường dẫn Callback hứng dữ liệu trả về từ Google
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    // Gửi data sang service xử lý check DB / Tạo tài khoản và nhận lại JWT token nội bộ
    const token = await this.authService.loginWithGoogle(req.user);

    // TRƯỜNG HỢP 1: Khi chưa có FrontEnd -> Trả thẳng chuỗi JWT về màn hình dưới dạng JSON để test
    // return (res as any).status(200).json({ access_token: token });

    // TRƯỜNG HỢP 2: Sau này có FrontEnd, hãy comment dòng TRƯỜNG HỢP 1 lại và mở comment dòng dưới này ra
    return res.redirect(
      `https://goldenhoof-fe.vercel.app/oauth-success?token=${token}`,
    );
  }

  @Post('register/spectator')
  @ApiOperation({ summary: 'Đăng ký tài khoản cho Người xem (Spectator)' })
  registerSpectator(@Body() dto: RegisterSpectatorDto) {
    return this.authService.register(dto);
  }

  @Post('register/jockey')
  @ApiOperation({ summary: 'Đăng ký tài khoản cho Nài ngựa (Jockey)' })
  registerJockey(@Body() dto: RegisterJockeyDto) {
    return this.authService.register(dto);
  }

  @Post('register/referee')
  @ApiOperation({ summary: 'Đăng ký tài khoản cho Trọng tài (Referee)' })
  registerReferee(@Body() dto: RegisterRefereeDto) {
    return this.authService.register(dto);
  }

  @Post('register/horse-owner')
  @ApiOperation({ summary: 'Đăng ký tài khoản cho Chủ ngựa (Horse Owner)' })
  registerOwner(@Body() dto: RegisterHorseOwnerDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin profile chi tiết của tài khoản hiện tại',
  })
  // @ApiHeader({
  //   name: 'x-refresh-token',
  //   description: 'Dán chuỗi Refresh Token vào đây để test tự động gia hạn',
  //   required: false, // Để false để lúc bình thường không bắt buộc nhập
  // })
  getProfile(@Request() req: any): ResponseUserDto {
    return this.authService.getProfile(req.user);
  }
}
