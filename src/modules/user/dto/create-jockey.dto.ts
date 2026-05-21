import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';

export class CreateJockeyDto {
  @ApiProperty({
    enum: RoleEnum,
    default: RoleEnum.JOCKEY,
    example: RoleEnum.JOCKEY,
    description: 'Vai trò mặc định cho biểu mẫu này là JOCKEY',
  })
  @IsEnum(RoleEnum)
  @IsNotEmpty()
  role: RoleEnum = RoleEnum.JOCKEY;

  @ApiProperty({ example: 52, description: 'Cân nặng của nài ngựa (kg)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(30)
  weight: number;

  @ApiProperty({ example: 162, description: 'Chiều cao của nài ngựa (cm)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(100)
  height: number;
}

export class RegisterJockeyDto extends IntersectionType(
  CreateUserDto,
  CreateJockeyDto,
) {}
