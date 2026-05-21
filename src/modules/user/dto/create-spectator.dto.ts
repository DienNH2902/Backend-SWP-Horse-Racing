import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateSpectatorDto {
  @ApiProperty({
    enum: RoleEnum,
    default: RoleEnum.SPECTATOR,
    example: RoleEnum.SPECTATOR,
    description: 'Vai trò mặc định cho biểu mẫu này là SPECTATOR',
  })
  @IsEnum(RoleEnum)
  @IsNotEmpty()
  role: RoleEnum = RoleEnum.SPECTATOR;
}

export class RegisterSpectatorDto extends IntersectionType(
  CreateUserDto,
  CreateSpectatorDto,
) {}
