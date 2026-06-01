import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

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
    example: '06/01/2026',
    description: 'DD/MM/YYYY format',
    required: true,
  })
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
  startDate: Date;

  @ApiProperty({
    example: '06/03/2026',
    description: 'DD/MM/YYYY format',
    required: true,
  })
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
  endDate: Date;

  @ApiProperty({ example: 'Sân vận động Phú Thọ, TP.HCM' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 5, description: 'Tổng số vòng đấu' })
  @IsNumber()
  @Min(1)
  totalRounds: number;

  @ApiProperty({ example: 8, description: 'Số ngựa tối đa mỗi lượt chạy' })
  @IsNumber()
  @Min(2)
  horsesPerRace: number;

  @ApiProperty({ example: 20, description: 'Tổng số trận đấu trong giải' })
  @IsNumber()
  @Min(1)
  totalRaces: number;

  @ApiProperty({ example: 500000, description: 'Phí tham gia giải đấu' })
  @IsNumber()
  @Min(0)
  entryFee: number;
}
