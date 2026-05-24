import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';

export class AdminUpdateJockeyStatusDto {
  @ApiProperty({
    example: JockeyStatusEnum.AVAILABLE,
    enum: JockeyStatusEnum,
    description: 'Trạng thái mới của Jockey cần cập nhật',
  })
  @IsEnum(JockeyStatusEnum, { message: 'Trạng thái không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  jockeyStatus: JockeyStatusEnum;
}
