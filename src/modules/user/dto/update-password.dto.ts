// src/modules/users/dto/update-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength, NotEquals } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'OldPass123@', description: 'Mật khẩu hiện tại' })
  @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
  oldPassword: string;

  @ApiProperty({ example: 'NewPass123@', description: 'Mật khẩu mới' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  @NotEquals((obj: UpdatePasswordDto) => obj.oldPassword, {
    message: 'Mật khẩu mới không được phép trùng với mật khẩu hiện tại',
  })
  newPassword: string;
}
