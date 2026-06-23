import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BreachingPartyEnum } from 'src/constants/breachingPartyEnum.enum';

export class CreateContractBreachDto {
  @ApiProperty({
    description: 'ID của hợp đồng xảy ra vi phạm',
    example: '65f1c2b3e4b0a123456789ab',
  })
  @IsString()
  @IsNotEmpty({ message: 'ID hợp đồng không được để trống' })
  contractId: string;

  @ApiProperty({
    description: 'Bên vi phạm hợp đồng (Horse Owner hoặc Jockey)',
    enum: BreachingPartyEnum,
    example: BreachingPartyEnum.HORSE_OWNER,
  })
  @IsEnum(BreachingPartyEnum, {
    message: 'Bên vi phạm phải là Horse Owner hoặc Jockey',
  })
  @IsNotEmpty({ message: 'Bên vi phạm không được để trống' })
  breachingParty: BreachingPartyEnum;

  @ApiProperty({
    description: 'Lý do dẫn đến việc vi phạm / hủy hợp đồng',
    example:
      'Chủ ngựa tự ý rút lui khỏi giải đấu sát giờ chạy mà không có lý do chính đáng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Lý do vi phạm không được để trống' })
  reason: string;
}
