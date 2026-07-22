import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { HorseService } from './horse.service';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; // Giả định tên file Guard phân quyền của bạn
import { Roles } from '../auth/decorators/roles.decorator'; // Giả định tên decorator phân quyền của bạn
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { ResponseHorseDto } from './dto/response-horse.dto';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';

@ApiTags('Horses')
@Controller('horses')
export class HorseController {
  constructor(private readonly horseService: HorseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER) // Chỉ tài khoản có Role là 'Horse Owner' mới lọt qua
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ ngựa thêm mới một con ngựa để quản lý' })
  create(
    @Body() dto: CreateHorseDto,
    @Request() req: any,
  ): Promise<ResponseHorseDto> {
    // Lấy ID người dùng từ JwtStrategy gán vào req.user._id hoặc req.user.sub
    const userId = req.user._id as string;
    return this.horseService.createHorse(dto, userId);
  }

  // @Get()
  // @ApiOperation({ summary: 'Lấy toàn bộ danh sách ngựa trong hệ thống' })
  // findAll(): Promise<ResponseHorseDto[]> {
  //   return this.horseService.findAllHorses();
  // }

  @Get()
  @ApiOperation({
    summary:
      'Lấy toàn bộ danh sách ngựa trong hệ thống (có hỗ trợ search, filter status & sort by winRate)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm kiếm theo tên ngựa',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: HorseStatusEnum,
    description: 'Lọc theo trạng thái của ngựa',
  })
  @ApiQuery({
    name: 'sortWinRate',
    required: false,
    enum: ['asc', 'desc'],
    description:
      'Sắp xếp theo tỷ lệ thắng (asc: thấp đến cao, desc: cao đến thấp)',
  })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: HorseStatusEnum,
    @Query('sortWinRate') sortWinRate?: 'asc' | 'desc',
  ): Promise<ResponseHorseDto[]> {
    return this.horseService.findAllHorses(search, sortWinRate, status);
  }

  @Get('my-horses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách ngựa trong của tôi' })
  findAllMyHorse(@Request() req: any): Promise<ResponseHorseDto[]> {
    const userId = req.user._id as string;
    return this.horseService.findAllMyHorses(userId);
  }

  @Get('admin/dashboard/stats')
  async getHorseDashboardStatistics(): Promise<{
    totalHorses: number;
    statuses: Record<string, number>;
  }> {
    return await this.horseService.getHorseDashboardStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết thông tin một con ngựa bằng ID' })
  findOne(@Param('id') id: string): Promise<ResponseHorseDto> {
    return this.horseService.findOneHorse(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ ngựa cập nhật thông tin ngựa của mình' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHorseDto,
    @Request() req: any,
  ): Promise<ResponseHorseDto> {
    const userId = req.user._id as string;
    return this.horseService.updateHorse(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ ngựa xóa ngựa khỏi danh sách quản lý' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user._id as string;
    return this.horseService.removeHorse(id, userId);
  }
}
