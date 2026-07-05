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
import { ContractBreachService } from './contractBreach.service';
import { CreateContractBreachDto } from './dto/create-contract-breach.dto';

@ApiTags('Jockey Invitations')
@Controller('jockey-invitations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JockeyInvitationController {
  constructor(
    private readonly service: JockeyInvitationService,
    private readonly contractBreachService: ContractBreachService,
  ) {}

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

  // ─── CÁC ROUTE PHỤC VỤ XỬ LÝ VI PHẠM VÀ HOÀN THÀNH HỢP ĐỒNG ───

  // Admin xử lý vi phạm hợp đồng liên quan đến lời mời/hợp đồng này
  @Post('contracts/report-breach')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.REFEREE)
  @ApiOperation({
    summary: 'Admin xử lý và lập biên bản vi phạm điều khoản hợp đồng',
    description:
      'Khấu trừ tiền phạt đền bù, trích thu 10% về ví hệ thống và hoàn trả số dư đóng băng hợp lệ.',
  })
  reportContractBreach(@Body() dto: CreateContractBreachDto) {
    return this.contractBreachService.reportBreach(dto);
  }

  // Admin nghiệm thu và giải ngân hợp đồng sau khi giải đấu kết thúc tốt đẹp
  @Patch('contracts/:contractId/complete')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary:
      'Admin hoàn thành hợp đồng tốt đẹp (Giải ngân tiền công cho Jockey)',
    description:
      'Giải phóng toàn bộ số dư đóng băng, hoàn cọc đền bù và chuyển lương cho Jockey.',
  })
  @ApiParam({
    name: 'contractId',
    description: 'ID của hợp đồng cần nghiệm thu',
  })
  completeContract(@Param('contractId') contractId: string) {
    return this.contractBreachService.completeContract(contractId);
  }
}
