import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { JockeyInvitationEnum } from 'src/constants/jockeyInvitationEnum.enum';

export class RespondJockeyInvitationDto {
  @ApiProperty({
    example: JockeyInvitationEnum.ACCEPTED,
    enum: JockeyInvitationEnum,
    description: 'Trạng thái mới của thư mời Jockey cần cập nhật',
  })
  @IsEnum(JockeyInvitationEnum, { message: 'Trạng thái không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: JockeyInvitationEnum;
}
