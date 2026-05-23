import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JockeyLicenseService } from './jockey-license.service';
import { CreateJockeyLicenseDto } from './dto/create-jockey-license.dto';
import { ResponseJockeyLicenseDto } from './dto/response-jockey-license.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateJockeyLicenseDto } from './dto/update-jockey-license.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Jockey Licenses')
@Controller('jockey-licenses')
export class JockeyLicenseController {
  constructor(private readonly licenseService: JockeyLicenseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.JOCKEY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm mới một chứng chỉ hành nghề cho Jockey' })
  async createLicense(
    @Request() req: any,
    @Body() dto: CreateJockeyLicenseDto,
  ): Promise<ResponseJockeyLicenseDto> {
    const userId = req.user._id as string;
    return await this.licenseService.create(userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.JOCKEY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'JOCKEY lấy danh sách chứng chỉ của chính mình' })
  async getMyLicenses(
    @Request() req: any,
  ): Promise<ResponseJockeyLicenseDto[]> {
    const userId = req.user._id as string;
    return await this.licenseService.getMyLicenses(userId);
  }

  @Get('profile/:profileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ADMIN lấy danh sách toàn bộ chứng chỉ theo ID của Jockey Profile',
  })
  async getByProfile(
    @Param('profileId') profileId: string,
  ): Promise<ResponseJockeyLicenseDto[]> {
    return await this.licenseService.getLicensesByProfile(profileId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.JOCKEY)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'JOCKEY cập nhật chứng chỉ hành nghề theo ID',
  })
  async updateLicense(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateJockeyLicenseDto,
  ): Promise<ResponseJockeyLicenseDto> {
    const userId = req.user._id as string;
    return await this.licenseService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.JOCKEY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa một chứng chỉ hành nghề theo ID' })
  async removeLicense(@Param('id') id: string) {
    return await this.licenseService.remove(id);
  }
}
