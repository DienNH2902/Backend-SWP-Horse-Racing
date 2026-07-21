import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUrl,
  Min,
  IsDate,
  IsOptional,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Parse chuỗi ngày dạng DD/MM/YYYY thành Date theo local time.
 * Trả về giá trị gốc nếu không hợp lệ, để @IsDate() có thể bắt lỗi.
 */
function parseDateString(value: unknown): unknown {
  if (typeof value === 'string' && value.includes('/')) {
    const [day, month, year] = value.split('/');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(date.getTime()) ? value : date;
  }
  return value;
}

export class CreateTournamentDto {
  @ApiProperty({ example: 'Golden Hoof Championship 2026' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Giải đua ngựa lớn nhất năm dành cho các chiến mã xuất sắc.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'https://example.com/images/tournament-banner.jpg',
    required: false,
    description: 'Đường dẫn ảnh banner hoặc logo của giải đấu',
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: '06/01/2026',
    description: 'DD/MM/YYYY format',
    required: true,
  })
  @Transform(({ value }) => parseDateString(value))
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    example: '06/03/2026',
    description: 'DD/MM/YYYY format',
    required: true,
  })
  @Transform(({ value }) => parseDateString(value))
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({ example: 'Sân vận động Phú Thọ, TP.HCM' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 2, description: 'Tổng số vòng đấu cố định' })
  @IsNumber()
  @Min(2)
  totalRounds: number;

  @ApiProperty({ example: 8, description: 'Số ngựa tối đa mỗi lượt chạy' })
  @IsNumber()
  @IsNumber()
  @Min(8)
  @Max(10)
  horsesPerRace: number;

  @ApiProperty({ example: 3, description: 'Tổng số trận đấu trong giải' })
  @IsNumber()
  @Min(2)
  @Max(10)
  totalRaces: number;

  @ApiProperty({
    example: 500000,
    description: 'Phí tham gia giải đấu (Từ 0 đến 100.000.000)',
  })
  @IsNumber()
  @Min(0)
  @Max(100000000)
  entryFee: number;
}
