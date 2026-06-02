import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RaceCourseService } from './race-course.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import {
  CreateRaceCourseDto,
  UpdateRaceCourseDto,
  ResponseRaceCourseDto,
} from './dto';

@ApiTags('Race Courses')
@Controller('race-courses')
export class RaceCourseController {
  constructor(private readonly service: RaceCourseService) {}

  /**
   * Referee / Admin xem danh sách đường đua để chọn khi chuẩn bị race
   */
  @Get()
  @ApiOperation({ summary: 'Xem danh sách tất cả đường đua' })
  findAll(): Promise<ResponseRaceCourseDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một đường đua' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string): Promise<ResponseRaceCourseDto> {
    return this.service.findById(id);
  }

  /**
   * Chỉ Admin mới được tạo / sửa / xóa đường đua
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin tạo mới đường đua' })
  create(@Body() dto: CreateRaceCourseDto): Promise<ResponseRaceCourseDto> {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin cập nhật đường đua' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRaceCourseDto,
  ): Promise<ResponseRaceCourseDto> {
    return this.service.update(id, dto);
  }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(RoleEnum.ADMIN)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Admin xóa đường đua' })
  // @ApiParam({ name: 'id' })
  // remove(@Param('id') id: string): Promise<{ message: string }> {
  //   return this.service.remove(id);
  // }
}