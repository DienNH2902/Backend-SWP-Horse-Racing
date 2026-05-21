import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, IsDateString } from 'class-validator';

export class CreateJockeyLicenseDto {
  //   @ApiProperty({
  //     example: '6a0eab3ba117cdbf6701db11',
  //     description: 'ID của Jockey Profile sở hữu chứng chỉ này',
  //   })
  //   @IsString()
  //   @IsNotEmpty()
  //   jockeyProfileId: string;

  @ApiProperty({
    example: 'LIC-2026-9999',
    description: 'Mã số hiển thị trên chứng chỉ hành nghề',
  })
  @IsString()
  @IsNotEmpty()
  licenseCode: string;

  @ApiProperty({
    example:
      'https://storage.googleapis.com/horse-racing/certificates/lic_99.pdf',
    description: 'Đường dẫn lưu trữ file ảnh hoặc PDF của chứng chỉ',
  })
  @IsUrl()
  @IsNotEmpty()
  licenseUrl: string;

  @ApiProperty({
    example: '2026-05-21',
    description: 'Ngày bắt đầu có hiệu lực thi đấu (Định dạng YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  racingStartDate: string;
}
