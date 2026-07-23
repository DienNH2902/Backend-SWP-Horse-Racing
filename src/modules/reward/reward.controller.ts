import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  UseGuards,
  Body,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { RewardService } from './reward.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateRewardDto } from './dto/create-reward.dto';
import { ResponseRewardDto } from './dto/response-reward.dto';
import { RewardConditionType } from 'src/constants/rewardConditionTypeEnum.enum';
import { RewardType } from 'src/constants/rewardTypeEnum.enum';

@Controller('rewards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một phần thưởng trên hệ thống (Admin)' })
  @ApiResponse({ status: 21, type: ResponseRewardDto })
  async create(@Body() dto: CreateRewardDto): Promise<ResponseRewardDto> {
    return await this.rewardService.createReward(dto);
  }

  // @Get()
  // @ApiOperation({ summary: 'Lấy danh sách toàn bộ phần thưởng hiện có' })
  // @ApiResponse({ status: 20, type: [ResponseRewardDto] })
  // async findAll(): Promise<ResponseRewardDto[]> {
  //   return await this.rewardService.findAllRewards();
  // }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phần thưởng có hỗ trợ filter' })
  @ApiQuery({
    name: 'conditionType',
    enum: RewardConditionType,
    required: false,
    description: 'Lọc theo điều kiện phần thưởng',
  })
  @ApiQuery({
    name: 'rewardType',
    enum: RewardType,
    required: false,
    description: 'Lọc theo loại phần thưởng',
  })
  @ApiResponse({ status: 200, type: [ResponseRewardDto] })
  async findAll(
    @Query('conditionType') conditionType?: RewardConditionType,
    @Query('rewardType') rewardType?: RewardType,
  ): Promise<ResponseRewardDto[]> {
    return await this.rewardService.findAllRewards(conditionType, rewardType);
  }

  // Lấy danh sách hiển thị bảng quà tặng kèm trạng thái nút (Sẵn sàng nhận, Đã khóa, Đã mua)
  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const userId = req.user._id as string;
    return await this.rewardService.getRewardsDashboard(userId);
  }

  // Trả về toàn bộ danh sách tên/đường dẫn link ảnh của khung và nền đã sở hữu để FE render
  @Get('my-assets')
  async getMyAssets(@Request() req: any) {
    const userId = req.user._id as string;
    return await this.rewardService.getUnlockedAssets(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một phần thưởng bằng ID' })
  @ApiResponse({ status: 20, type: ResponseRewardDto })
  async findOne(@Param('id') id: string): Promise<ResponseRewardDto> {
    return await this.rewardService.findOneReward(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Chỉnh sửa / Cập nhật cấu hình phần thưởng theo ID (Admin)',
  })
  @ApiResponse({ status: 200, type: ResponseRewardDto })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRewardDto>,
  ): Promise<ResponseRewardDto> {
    return await this.rewardService.updateReward(id, dto);
  }

  // API xử lý gộp cho cả hành động Bấm Nhận (Milestone) hoặc Bấm Mua (Shop)
  @Post('claim/:rewardId')
  async claimReward(@Request() req: any, @Param('rewardId') rewardId: string) {
    const userId = req.user._id as string;
    return await this.rewardService.processClaimReward(userId, rewardId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một phần thưởng bằng ID' })
  @ApiResponse({ status: 20, type: ResponseRewardDto })
  async deleteReward(@Param('id') id: string): Promise<any> {
    return await this.rewardService.removeReward(id);
  }
}
