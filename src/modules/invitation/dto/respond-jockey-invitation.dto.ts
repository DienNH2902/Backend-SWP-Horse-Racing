import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { InvitationStatusEnum } from '../schemas/invitation.schema';
 
const RESPOND_STATUSES = [
  InvitationStatusEnum.ACCEPTED,
  InvitationStatusEnum.REJECTED,
] as const;
type RespondStatus = (typeof RESPOND_STATUSES)[number];
 
export class RespondJockeyInvitationDto {
  @ApiProperty({ enum: RESPOND_STATUSES, example: InvitationStatusEnum.ACCEPTED })
  @IsEnum(RESPOND_STATUSES)
  status: RespondStatus;
}