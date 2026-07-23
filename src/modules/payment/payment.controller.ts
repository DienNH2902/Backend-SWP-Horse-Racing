// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Query,
//   Req,
//   UseGuards,
//   Request,
//   HttpStatus,
// } from '@nestjs/common';
// import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { PaymentService } from './payment.service';
// import { CreateVnPayPaymentDto } from './dto/create-vnpay-payment.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { RoleEnum } from 'src/constants/roleEnum.enum';
// import { ResponseTransactionDto } from './dto/response-transaction.dto';

// @ApiTags('Payment & Transactions')
// @Controller('payment')
// export class PaymentController {
//   constructor(private readonly paymentService: PaymentService) {}

//   @Post('vnpay/deposit')
//   @UseGuards(JwtAuthGuard)
//   @ApiBearerAuth()
//   @ApiOperation({
//     summary: 'Tạo link nạp tiền VNPay (Dành cho Horse Owner & Jockey)',
//   })
//   async createDeposit(@Body() dto: CreateVnPayPaymentDto, @Req() req: any) {
//     const clientIp =
//       (req.headers['x-forwarded-for'] as string) ||
//       req.socket?.remoteAddress ||
//       '127.0.0.1';
//     const paymentUrl = await this.paymentService.createDepositUrl(
//       req.user._id,
//       dto.amount,
//       clientIp,
//       dto.bankCode,
//     );
//     return { success: true, paymentUrl };
//   }

//   @Get('vnpay/callback')
//   @ApiOperation({ summary: 'Webhook xử lý kết quả trả về từ VNPay' })
//   async vnpayCallback(@Query() query: Record<string, string>) {
//     const result = await this.paymentService.processVnPayCallback(query);
//     return {
//       statusCode: result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
//       ...result,
//     };
//   }

//   @Get('transactions/my')
//   @UseGuards(JwtAuthGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Lấy lịch sử giao dịch của tôi' })
//   getMyTransactions(@Request() req: any): Promise<ResponseTransactionDto[]> {
//     return this.paymentService.getMyTransactions(req.user._id as string);
//   }

//   @Get('transactions/all')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(RoleEnum.ADMIN)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Admin lấy toàn bộ lịch sử giao dịch hệ thống' })
//   getAllTransactions(): Promise<ResponseTransactionDto[]> {
//     return this.paymentService.getAllTransactions();
//   }
// }
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  // HttpStatus,
  Res,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CreateVnPayPaymentDto } from './dto/create-vnpay-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { ResponseTransactionDto } from './dto/response-transaction.dto';
import { ConfigService } from '@nestjs/config';
import { VnPayQueryDto } from './dto/vnpay-query.dto';
import { ApproveWithdrawalDto } from './dto/approval-withdrawal.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { SystemWalletOverviewDto } from './dto/system-wallet.dto';
import { SystemWalletService } from './system-wallet.service';
import { WithdrawalStatusEnum } from 'src/constants/withdrawalStatusEnum.enum';

interface RequestWithUser extends Request {
  user: {
    _id: string;
    role: string;
  };
}

@ApiTags('Payment & Transactions')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly systemWalletService: SystemWalletService,
    private readonly configService: ConfigService,
  ) {}

  @Post('vnpay/deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo link nạp tiền VNPay (Dành cho Horse Owner & Jockey)',
  })
  async createDeposit(
    @Body() dto: CreateVnPayPaymentDto,
    @Req() req: RequestWithUser,
  ) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp: string =
      (typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]
        : undefined) ||
      (Array.isArray(forwardedFor) ? forwardedFor[0] : undefined) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const paymentUrl = await this.paymentService.createDepositUrl(
      req.user._id,
      dto.amount,
      clientIp,
      dto.bankCode,
    );
    return { success: true, paymentUrl };
  }

  @Get('system-wallet/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin xem tổng quan ví hệ thống, phân rã nguồn thu và dữ liệu biểu đồ theo tháng',
  })
  @ApiResponse({
    status: 200,
    type: SystemWalletOverviewDto,
    description: 'Chi tiết tài chính hệ thống phục vụ Dashboard Admin',
  })
  async getSystemWalletOverview(): Promise<SystemWalletOverviewDto> {
    return this.systemWalletService.getSystemWalletOverview();
  }

  @Get('vnpay/callback')
  @ApiOperation({
    summary: 'Webhook xử lý kết quả trả về từ VNPay và redirect về FE',
  })
  async vnpayCallback(@Query() query: VnPayQueryDto, @Res() res: Response) {
    // Lấy FE_URL từ file .env thông qua ConfigService, nếu không có thì fallback về link default
    const feUrlConfig =
      this.configService.get<string>('FE_URL') ||
      'https://goldenhoof-fe.vercel.app/payment-result';

    try {
      // 1. Backend xử lý logic kiểm tra chữ ký, lưu DB, bắn notification...
      await this.paymentService.processVnPayCallback(query as any);

      // 2. Tạo URL chuyển hướng về trang thông báo của Frontend dựa trên config env
      const targetFeUrl = new URL(feUrlConfig);
      targetFeUrl.searchParams.append(
        'vnp_ResponseCode',
        query['vnp_ResponseCode'] || '',
      );
      targetFeUrl.searchParams.append('vnp_Amount', query['vnp_Amount'] || '0');
      targetFeUrl.searchParams.append('vnp_TxnRef', query['vnp_TxnRef'] || '');
      targetFeUrl.searchParams.append(
        'vnp_BankCode',
        query['vnp_BankCode'] || '',
      );
      targetFeUrl.searchParams.append(
        'vnp_PayDate',
        query['vnp_PayDate'] || '',
      );

      // 3. Thực hiện redirect người dùng về giao diện Frontend
      return res.redirect(targetFeUrl.toString());
    } catch (error) {
      console.error('VNPay Callback Error:', error);

      // Trường hợp lỗi: tạo URL thất bại và redirect về FE_URL kèm code lỗi 99
      const targetFeUrl = new URL(feUrlConfig);
      targetFeUrl.searchParams.append(
        'vnp_ResponseCode',
        query['vnp_ResponseCode'] || '99',
      );
      targetFeUrl.searchParams.append('vnp_TxnRef', query['vnp_TxnRef'] || '');

      return res.redirect(targetFeUrl.toString());
    }
  }

  /**
   * CẬP NHẬT BẢO MẬT: Endpoint IPN xử lý mất mạng giữa chừng (Server-to-Server)
   * VNPay sẽ gọi ngầm endpoint này. Định dạng trả về bắt buộc theo chuẩn quy định của VNPay.
   * Cần cấu hình URL này trong Dashboard quản lý merchant của VNPay (hoặc file env mục VNP_IPN_URL nếu có).
   */
  @Get('vnpay/ipn')
  @ApiOperation({
    summary:
      'Endpoint IPN xử lý ngầm từ Server VNPay sang Server Backend khi mất mạng',
  })
  async vnpayIpn(@Query() query: VnPayQueryDto) {
    try {
      // Thực hiện toàn bộ logic check chữ ký, kiểm tra số tiền, cộng balance và tạo transaction
      await this.paymentService.processVnPayCallback(query as any);

      // Trả về đúng format Object yêu cầu của VNPay để họ xác nhận đã xử lý thành công
      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error: any) {
      console.error('VNPay IPN Error:', error);

      // Phân loại mã lỗi trả về cho VNPay dựa trên loại Exception để VNPay biết có cần gọi lại hay không
      if (error?.message === 'Chữ ký không hợp lệ') {
        return { RspCode: '97', Message: 'Invalid Checksum' };
      }
      if (
        error?.message === 'Số tiền thanh toán không khớp với yêu cầu khởi tạo'
      ) {
        return { RspCode: '04', Message: 'Invalid Amount' };
      }
      if (error?.message === 'Người dùng không tồn tại') {
        return { RspCode: '01', Message: 'User Not Found' };
      }

      // Lỗi hệ thống khác hoặc các lỗi runtime không xác định
      return {
        RspCode: '99',
        Message: (error?.message as string) || 'Unknown Error',
      };
    }
  }

  @Get('transactions/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy lịch sử giao dịch của tôi' })
  getMyTransactions(
    @Req() req: RequestWithUser,
  ): Promise<ResponseTransactionDto[]> {
    return this.paymentService.getMyTransactions(req.user._id);
  }

  @Get('transactions/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin lấy toàn bộ lịch sử giao dịch hệ thống' })
  getAllTransactions(): Promise<ResponseTransactionDto[]> {
    return this.paymentService.getAllTransactions();
  }

  @Post('withdrawal/request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.JOCKEY, RoleEnum.HORSE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Khởi tạo yêu cầu rút tiền (Dành cho Horse Owner & Jockey)',
  })
  async requestWithdrawal(
    @Body() dto: CreateWithdrawalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.paymentService.requestWithdrawal(req.user._id, dto);
  }

  @Get('withdrawal/admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin lấy danh sách toàn bộ các yêu cầu rút tiền trên hệ thống (có filter & search)',
  })
  @ApiQuery({
    name: 'status',
    enum: WithdrawalStatusEnum,
    required: false,
    description: 'Lọc theo trạng thái yêu cầu rút tiền',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Tìm kiếm theo tên người dùng (fullName)',
  })
  async getAllWithdrawals(
    @Query('status') status?: WithdrawalStatusEnum,
    @Query('search') search?: string,
  ) {
    return this.paymentService.getAllWithdrawalRequests(status, search);
  }

  @Get('withdrawal/my-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.JOCKEY, RoleEnum.HORSE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy tất cả các yêu cầu rút tiền của tôi (Dành cho Horse Owner & Jockey)',
  })
  async findAllMyRequest(@Req() req: RequestWithUser) {
    return this.paymentService.findAllMyRequest(req.user._id);
  }

  @Get('withdrawal/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.JOCKEY, RoleEnum.HORSE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin xem chi tiết thông tin một đơn rút kèm dữ liệu chi tiết của User',
  })
  async getWithdrawalDetail(@Param('id') id: string) {
    return this.paymentService.getWithdrawalDetail(id);
  }

  @Post('withdrawal/admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin phê duyệt giải ngân rút tiền thành công (Đã chuyển khoản ngoài đời thực)',
  })
  async approveWithdrawal(
    @Param('id') id: string,
    @Body() dto: ApproveWithdrawalDto,
  ) {
    return this.paymentService.approveWithdrawal(id, dto);
  }

  @Post('withdrawal/admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin từ chối yêu cầu rút tiền và hoàn trả lại số dư đóng băng cho User',
  })
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: ApproveWithdrawalDto,
  ) {
    return this.paymentService.rejectWithdrawal(id, dto);
  }
}
