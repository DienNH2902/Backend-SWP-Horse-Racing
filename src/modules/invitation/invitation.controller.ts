import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Req,
  Query,
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
import { FilterContractDto } from './dto/filter-contract.dto';
import { ProcessContractBreachDto } from './dto/process-contract-breach.dto';

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

  @Get('all-contract')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'ADMIN xem toàn bộ danh sách hợp đồng (có filter)' })
  getAllContracts(
    @Query() filterDto: FilterContractDto,
  ): Promise<ResponseContractDto[]> {
    return this.service.getAllContracts(filterDto);
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

  // Lấy thông tin vi phạm hợp đồng theo contractId
  @Get('contracts/:contractId/breach')
  @ApiOperation({
    summary: 'Lấy thông tin đơn tố cáo/vi phạm theo ID hợp đồng',
  })
  @ApiParam({
    name: 'contractId',
    description: 'ID của hợp đồng cần kiểm tra vi phạm',
  })
  getBreachByContractId(@Param('contractId') contractId: string) {
    return this.contractBreachService.findByContractId(contractId);
  }

  // User (Owner/Jockey) báo cáo vi phạm hoặc tự hủy hợp đồng
  @Post('contracts/report-breach')
  @ApiOperation({
    summary: 'Báo cáo vi phạm hoặc tự hủy hợp đồng',
    description:
      'Gửi đơn tố cáo đối phương (chờ Admin duyệt) hoặc tự hủy hợp đồng (thực thi phạt ngay lập tức).',
  })
  reportContractBreach(@Req() req: any, @Body() dto: CreateContractBreachDto) {
    const userId = req.user._id as string;
    return this.contractBreachService.reportBreach(userId, dto);
  }

  // Admin xử lý duyệt hoặc từ chối đơn tố cáo vi phạm
  @Patch('contracts/breaches/:breachId/process')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Admin phê duyệt hoặc từ chối đơn tố cáo vi phạm hợp đồng',
  })
  @ApiParam({
    name: 'breachId',
    description: 'ID của bản ghi tố cáo vi phạm (Breach Record ID)',
  })
  processBreachReportByAdmin(
    @Param('breachId') breachId: string,
    @Body() dto: ProcessContractBreachDto,
  ) {
    return this.contractBreachService.processBreachReportByAdmin(
      breachId,
      dto.isApproved,
      dto.adminReason,
    );
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
