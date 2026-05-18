import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
// import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';
import { GenderEnum } from 'src/constants/genderEnum.enum';
// import { RoleEnum } from 'src/constants/roleEnum.enum';

export class CreateUserDto {
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

  @ApiProperty({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '123 Đường số 123, Thành phố Hồ Chí Minh' })
  @IsString()
  @IsOptional()
  address?: string;

  // @ApiProperty({
  //   example: '1995-01-01',
  //   description: 'YYYY-MM-DD format',
  //   required: false,
  // })
  // @IsDate()
  // @IsOptional()
  // @Type(() => Date)
  // dateOfBirth?: Date;
  @ApiProperty({
    example: '29/03/2003',
    description: 'DD/MM/YYYY format',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Nếu value truyền lên là chuỗi dạng DD/MM/YYYY
    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/');
      // Chuyển thành định dạng YYYY-MM-DD để tạo Object Date chuẩn
      return new Date(`${year}-${month}-${day}`);
    }
    return value;
  })
  @IsDate()
  dateOfBirth?: Date;

  @ApiProperty({
    example: 'https://ui-avatars.com/api/?name=Nguyen+Van+A',
    description: 'URL to the user profile image',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ enum: GenderEnum, example: GenderEnum.MALE })
  @IsEnum(GenderEnum)
  @IsOptional()
  gender: GenderEnum;

  // @ApiProperty({ enum: RoleEnum, example: RoleEnum.SPECTATOR })
  // @IsEnum(RoleEnum)
  // @IsOptional()
  // role?: RoleEnum;

  // @ApiProperty({ enum: AccountStatusEnum, example: AccountStatusEnum.ACTIVE })
  // @IsOptional()
  // @IsEnum(AccountStatusEnum)
  // status?: AccountStatusEnum;

  // @ApiProperty({ example: 'STB-001', required: false })
  // @IsOptional()
  // @IsString()
  // licenseNumber?: string;

  // @ApiProperty({ example: 'My Stable', required: false })
  // @IsOptional()
  // @IsString()
  // stableName?: string;

  // @ApiProperty({ example: 'user@example.com' })
  // @IsOptional()
  // @IsNumber()
  // weight?: number;
}
