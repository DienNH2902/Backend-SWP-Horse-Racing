// src/modules/otp/otp.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('OTP Authentication')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bước 1: Nhập email để hệ thống cấp và gửi mã OTP qua Email',
  })
  requestReset(@Body() dto: RequestOtpDto) {
    return this.otpService.requestResetPasswordOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Bước 2: Nhập đồng thời mã OTP và mật khẩu mới để cập nhật tài khoản',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.otpService.resetPassword(dto);
  }
}
