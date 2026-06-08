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
} from '@nestjs/common';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseUserDto } from './dto/response-user.dto';
import { UpdateJockeyDto } from './dto/update-jockey-profile.dto';
import { UpdateRefereeDto } from './dto/update-referee-profile.dto';
import { UpdateHorseOwnerDto } from './dto/update-horse-owner-profile.dto';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { UpdatePasswordDto } from './dto/update-password.dto';

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
  findAllJockeys(@Query('role') role: RoleEnum) {
    return this.userService.findAllUsersByRole(role);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.userService.removeUser(id);
  }
}
