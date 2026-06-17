import { PartialType } from '@nestjs/swagger';
import { CreateRaceBroadcastDto } from './create-race-broadcast.dto';

export class UpdateRaceBroadcastDto extends PartialType(CreateRaceBroadcastDto) {}
