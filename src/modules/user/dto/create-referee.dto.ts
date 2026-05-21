import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';

export class CreateRefereeDto extends CreateUserDto {
  @ApiProperty({
    enum: RoleEnum,
    default: RoleEnum.REFEREE,
    example: RoleEnum.REFEREE,
    description: 'Vai trò mặc định cho biểu mẫu này là REFEREE',
  })
  @IsEnum(RoleEnum)
  @IsNotEmpty()
  role: RoleEnum = RoleEnum.REFEREE;

  @ApiProperty({ example: 3, description: 'Số năm kinh nghiệm' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  experienceYears: number;

  @ApiProperty({
    example: 'National Referee Level 2',
    description: 'Bằng cấp trọng tài',
  })
  @IsString()
  @IsNotEmpty()
  certification: string;
}

export class RegisterRefereeDto extends IntersectionType(
  CreateUserDto,
  CreateRefereeDto,
) {}
