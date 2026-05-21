import { PartialType } from '@nestjs/swagger';
import { CreateJockeyLicenseDto } from './create-jockey-license.dto';

export class UpdateJockeyLicenseDto extends PartialType(CreateJockeyLicenseDto) {}
