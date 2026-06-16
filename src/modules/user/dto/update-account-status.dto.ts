import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';

export class UpdateAccountStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới của tài khoản',
    enum: AccountStatusEnum,
    example: AccountStatusEnum.ACTIVE,
  })
  @IsNotEmpty({ message: 'Trạng thái tài khoản không được để trống' })
  @IsEnum(AccountStatusEnum, {
    message: `Trạng thái phải thuộc một trong các giá trị: ${Object.values(AccountStatusEnum).join(', ')}`,
  })
  accountStatus: AccountStatusEnum;
}
