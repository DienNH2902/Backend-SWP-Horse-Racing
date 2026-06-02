import { PartialType } from '@nestjs/swagger';
import { CreateRaceConditionDto } from './create-race-condition.dto';

export class UpdateRaceConditionDto extends PartialType(CreateRaceConditionDto) {}
