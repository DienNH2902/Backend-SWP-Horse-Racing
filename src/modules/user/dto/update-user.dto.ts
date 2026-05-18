import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { GenderEnum } from 'src/constants/genderEnum.enum';

export class UpdateUserDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '123 Đường số 123, Thành phố Hồ Chí Minh' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: '29/03/2003',
    description: 'DD/MM/YYYY format',
    required: false,
  })
  @IsDate()
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
  dateOfBirth?: Date;

  @ApiProperty({
    example: 'https://ui-avatars.com/api/?name=Nguyen+Van+A',
    description: 'URL to the user profile image',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: 1, description: '0: Female, 1: Male, 2: Other' })
  @IsEnum(GenderEnum)
  gender: GenderEnum.MALE;

  //   @ApiProperty({ example: '65f1b... (Role ID)' })
  //   @IsMongoId()
  //   role: string;

  //   @ApiProperty({ example: '65f1c... (Status ID)' })
  //   @IsMongoId()
  //   status: string;

  @ApiProperty({ example: 'STB-001', required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ example: 'My Stable', required: false })
  @IsOptional()
  @IsString()
  stableName?: string;
}
