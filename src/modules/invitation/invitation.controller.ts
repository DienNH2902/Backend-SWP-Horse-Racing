import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { JockeyInvitationService } from './invitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import {
  CreateJockeyInvitationDto,
  RespondJockeyInvitationDto,
  ResponseJockeyInvitationDto,
  ResponseContractDto,
} from './dto';

@ApiTags('Jockey Invitations')
@Controller('jockey-invitations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JockeyInvitationController {
  constructor(private readonly service: JockeyInvitationService) {}

  // HorseOwner gửi lời mời cho jockey tham gia tournament
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiOperation({
    summary: 'Chủ ngựa gửi lời mời cho jockey tham gia giải đua',
  })
  send(
    @Body() dto: CreateJockeyInvitationDto,
    @Request() req: any,
  ): Promise<ResponseJockeyInvitationDto> {
    return this.service.sendInvitation(dto, req.user._id as string);
  }

  // Jockey xem tất cả lời mời gửi đến mình

  @Get('my-invitations')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.JOCKEY)
  @ApiOperation({ summary: 'Jockey xem danh sách lời mời được gửi đến' })
  getMyInvitations(
    @Request() req: any,
  ): Promise<ResponseJockeyInvitationDto[]> {
    return this.service.getMyInvitations(req.user._id as string);
  }

  // HorseOwner xem tất cả lời mời đã gửi đi

  @Get('sent')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiOperation({ summary: 'Chủ ngựa xem danh sách lời mời đã gửi' })
  getSent(@Request() req: any): Promise<ResponseJockeyInvitationDto[]> {
    return this.service.getSentInvitations(req.user._id as string);
  }

  // Xem chi tiết 1 invitation (cả jockey lẫn horseOwner liên quan)

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một lời mời' })
  @ApiParam({ name: 'id', description: 'JockeyInvitation ID' })
  getOne(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ResponseJockeyInvitationDto> {
    return this.service.getInvitationById(id, req.user._id as string);
  }

  // Jockey chấp nhận hoặc từ chối lời mời. Nếu ACCEPTED → contract tự động được tạo và trả về trong response

  @Patch(':id/respond')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.JOCKEY)
  @ApiOperation({
    summary:
      'Jockey phản hồi lời mời (accept/reject). Accept → tự động tạo contract',
  })
  @ApiParam({ name: 'id', description: 'JockeyInvitation ID' })
  respond(
    @Param('id') id: string,
    @Body() dto: RespondJockeyInvitationDto,
    @Request() req: any,
  ): Promise<{
    invitation: ResponseJockeyInvitationDto;
    contract?: ResponseContractDto;
  }> {
    return this.service.respondToInvitation(id, dto, req.user._id as string);
  }

  // Xem contract được tạo từ invitation này

  @Get(':id/contract')
  @ApiOperation({ summary: 'Xem hợp đồng được tạo từ lời mời này' })
  @ApiParam({ name: 'id', description: 'JockeyInvitation ID' })
  getContract(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ResponseContractDto> {
    return this.service.getContractByInvitation(id, req.user._id as string);
  }
}
