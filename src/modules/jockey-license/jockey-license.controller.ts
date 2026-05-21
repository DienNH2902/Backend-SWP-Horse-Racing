import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JockeyLicenseService } from './jockey-license.service';
import { CreateJockeyLicenseDto } from './dto/create-jockey-license.dto';
import { ResponseJockeyLicenseDto } from './dto/response-jockey-license.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Jockey Licenses')
@Controller('jockey-licenses')
export class JockeyLicenseController {
  constructor(private readonly licenseService: JockeyLicenseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm mới một chứng chỉ hành nghề cho Jockey' })
  async createLicense(
    @Request() req: any,
    @Body() dto: CreateJockeyLicenseDto,
  ): Promise<ResponseJockeyLicenseDto> {
    const userId = req.user._id as string;
    return await this.licenseService.create(userId, dto);
  }

  @Get('profile/:profileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách toàn bộ chứng chỉ theo ID của Jockey Profile',
  })
  async getByProfile(
    @Param('profileId') profileId: string,
  ): Promise<ResponseJockeyLicenseDto[]> {
    return await this.licenseService.getLicensesByProfile(profileId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa một chứng chỉ hành nghề theo ID' })
  async removeLicense(@Param('id') id: string) {
    return await this.licenseService.remove(id);
  }
}
