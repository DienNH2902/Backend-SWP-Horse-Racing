import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ContractStatusEnum } from 'src/constants/contractStatusEnum.enum';

export class FilterContractDto {
  @ApiPropertyOptional({
    enum: ContractStatusEnum,
    description: 'Trạng thái hợp đồng',
  })
  @IsOptional()
  @IsEnum(ContractStatusEnum)
  status?: ContractStatusEnum;

  @ApiPropertyOptional({
    description: 'ID của giải đấu (Tournament ID)',
  })
  @IsOptional()
  @IsMongoId()
  tournamentId?: string;
}
