// src/modules/auth/dto/register-base.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { GenderEnum } from 'src/constants/genderEnum.enum';
import { RoleEnum } from 'src/constants/roleEnum.enum';

export class RegisterBaseDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'usera@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '123 Đường số 1, TP. Hồ Chí Minh', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: '29/03/2003',
    description: 'Định dạng DD/MM/YYYY',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/');
      return new Date(`${year}-${month}-${day}`);
    }
    return value;
  })
  dateOfBirth?: Date;

  @ApiProperty({ enum: GenderEnum, example: GenderEnum.MALE })
  @IsEnum(GenderEnum)
  @IsOptional()
  gender: GenderEnum;

  @ApiProperty({ enum: RoleEnum, example: RoleEnum.SPECTATOR })
  @IsEnum(RoleEnum)
  @IsNotEmpty()
  role: RoleEnum;
}
