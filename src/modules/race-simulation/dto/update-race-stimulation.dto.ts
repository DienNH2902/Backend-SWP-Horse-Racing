import { PartialType } from '@nestjs/swagger';
import { CreateRaceStimulationDto } from './create-race-stimulation.dto';

export class UpdateRaceStimulationDto extends PartialType(CreateRaceStimulationDto) {}
