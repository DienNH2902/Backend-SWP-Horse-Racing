import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';

export class CreateHorseOwnerDto {
  @ApiProperty({
    enum: RoleEnum,
    default: RoleEnum.HORSE_OWNER,
    example: RoleEnum.HORSE_OWNER,
    description: 'Vai trò mặc định cho biểu mẫu này là HORSE_OWNER',
  })
  @IsEnum(RoleEnum)
  @IsNotEmpty()
  role: RoleEnum = RoleEnum.HORSE_OWNER;

  @ApiProperty({
    example: 'Lam Dong Sunshine Stable',
    description: 'Tên trang trại ngựa',
  })
  @IsString()
  @IsNotEmpty()
  stableName: string;

  @ApiProperty({
    example: 'Đức Trọng, Lâm Đồng',
    description: 'Địa chỉ trang trại',
  })
  @IsString()
  @IsOptional()
  stableAddress?: string;
}

export class RegisterHorseOwnerDto extends IntersectionType(
  CreateUserDto,
  CreateHorseOwnerDto,
) {}
