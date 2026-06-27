import { PartialType } from '@nestjs/swagger';
import { CreatePrizeDistributionDto } from './create-prize-distribution.dto';

export class UpdatePrizeDistributionDto extends PartialType(CreatePrizeDistributionDto) {}
