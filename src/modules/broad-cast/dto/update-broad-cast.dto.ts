import { PartialType } from '@nestjs/swagger';
import { CreateBroadCastDto } from './create-broad-cast.dto';

export class UpdateBroadCastDto extends PartialType(CreateBroadCastDto) {}
