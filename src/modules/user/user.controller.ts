import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
  Request,
  Patch,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseUserDto } from './dto/response-user.dto';
import { UpdateJockeyDto } from './dto/update-jockey-profile.dto';
import { UpdateRefereeDto } from './dto/update-referee-profile.dto';
import { UpdateHorseOwnerDto } from './dto/update-horse-owner-profile.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SearchUserDto } from './dto/search-user.dto';
import { AdjustPointsDto } from './dto/admin-adjust-points.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new user' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.userService.findAllUser();
  }

  @Get('role')
  @ApiOperation({ summary: 'Get all users by role' })
  @ApiQuery({
    name: 'jockeyStatus',
    enum: JockeyStatusEnum,
    required: false, // <-- Khai báo tường minh trường này KHÔNG bắt buộc
    description:
      'Trạng thái hoạt động của Jockey (Chỉ có tác dụng khi role là Jockey)',
  })
  findAllUsersByRole(
    @Query('role') role: RoleEnum,
    @Query('jockeyStatus') jockeyStatus?: JockeyStatusEnum,
  ) {
    return this.userService.findAllUsersByRole(role, jockeyStatus);
  }

  @Get('search/by-name')
  @ApiOperation({ summary: 'Tìm kiếm người dùng theo họ và tên (fullName)' })
  async searchByName(
    @Query() query: SearchUserDto,
  ): Promise<ResponseUserDto[]> {
    return await this.userService.searchUsersByName(query.fullName as string);
  }

  @Get('admin/dashboard/stats')
  async getDashboardStatistics(): Promise<{
    totalUsers: number;
    roles: Record<string, number>;
    accountStatuses: Record<string, number>;
    jockeyStatuses: Record<string, number>;
  }> {
    return await this.userService.getDashboardStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findOneUser(id);
  }

  @Put('change-password') // <-- Đường dẫn phẳng, không cần /:id nữa
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật đổi mật khẩu tài khoản' })
  async changePassword(
    @Body() dto: UpdatePasswordDto,
    @Request() req, // <-- Lấy đối tượng request chứa thông tin user đã login
  ): Promise<{ message: string }> {
    // Passport gán thông tin giải mã Token vào req.user. Lấy id trực tiếp từ đây
    const userId = req.user._id as string;
    return await this.userService.updatePassword(userId, dto);
  }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update user' })
  // update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  //   return this.userService.updateUser(id, dto);
  // }

  @Put('spectator/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật thông tin tài khoản Spectator (Khán giả)',
  })
  async updateSpectator(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ResponseUserDto> {
    return await this.userService.updateSpectator(id, dto);
  }

  @Put('jockey/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản Jockey (Nài ngựa)' })
  async updateJockey(
    @Param('id') id: string,
    @Body() dto: UpdateJockeyDto,
  ): Promise<ResponseUserDto> {
    return await this.userService.updateJockey(id, dto);
  }

  @Put('referee/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản Referee (Trọng tài)' })
  async updateReferee(
    @Param('id') id: string,
    @Body() dto: UpdateRefereeDto,
  ): Promise<ResponseUserDto> {
    return await this.userService.updateReferee(id, dto);
  }

  @Put('horse-owner/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật thông tin tài khoản Horse Owner (Chủ ngựa)',
  })
  async updateHorseOwner(
    @Param('id') id: string,
    @Body() dto: UpdateHorseOwnerDto,
  ): Promise<ResponseUserDto> {
    return await this.userService.updateHorseOwner(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ADMIN cập nhật trạng thái hoạt động của tài khoản',
  })
  @ApiParam({ name: 'id', description: 'ID của tài khoản cần cập nhật' })
  async updateAccountStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAccountStatusDto,
  ): Promise<ResponseUserDto> {
    return await this.userService.updateAccountStatus(id, dto.accountStatus);
  }

  @Patch(':userId/adjust-points')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật điểm (pointBalance) cho Spectator',
    description:
      'API dành cho Admin thực hiện cộng/trừ số dư pointBalance của spectator theo userId.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID của User (Spectator) cần điều chỉnh điểm',
  })
  @ApiBody({
    type: AdjustPointsDto,
    description: 'Dữ liệu số điểm cần điều chỉnh',
  })
  // @Roles(RoleEnum.ADMIN) // Chỉ cho phép Admin gọi API này
  async adjustPointBalance(
    @Param('userId') userId: string,
    @Body() adjustPointsDto: AdjustPointsDto,
  ) {
    return await this.userService.adjustPointBalance(userId, adjustPointsDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.userService.removeUser(id);
  }
}
