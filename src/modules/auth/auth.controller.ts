// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
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
import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from '../user/dto/response-user.dto';

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
  getProfile(@Request() req: any) {
    // Thông tin user đã được JwtStrategy validate và nhét sẵn vào req.user
    return plainToInstance(ResponseUserDto, req.user, {
      excludeExtraneousValues: true, // Chỉ lấy các trường được gắn @Expose()
    });
  }
}
