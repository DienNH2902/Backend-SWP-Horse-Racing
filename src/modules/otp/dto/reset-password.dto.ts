import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Khách hàng điền mật khẩu mới sau khi verify thành công
export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Otp' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có chính xác 6 ký số' })
  code: string;

  @ApiProperty({ example: 'NewPass123@', description: 'Mật khẩu mới' })
  @IsString()
  @Length(6, 50, { message: 'Mật khẩu mới phải từ 6 đến 50 ký tự' })
  newPassword: string;
}
