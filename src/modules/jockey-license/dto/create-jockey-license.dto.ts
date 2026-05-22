import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
    example: '10/05/2015',
    description: 'DD/MM/YYYY format',
    required: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Nếu value truyền lên là chuỗi dạng DD/MM/YYYY
    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/');
      // Chuyển thành định dạng YYYY-MM-DD để tạo Object Date chuẩn
      return new Date(`${year}-${month}-${day}`);
    }
    return value;
  })
  @IsDate()
  @IsNotEmpty()
  racingStartDate: Date;
}
