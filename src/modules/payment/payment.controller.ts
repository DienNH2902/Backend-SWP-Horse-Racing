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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CreateVnPayPaymentDto } from './dto/create-vnpay-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { ResponseTransactionDto } from './dto/response-transaction.dto';

interface RequestWithUser extends Request {
  user: {
    _id: string;
    role: string;
  };
}

@ApiTags('Payment & Transactions')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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

  @Get('vnpay/callback')
  @ApiOperation({
    summary: 'Webhook xử lý kết quả trả về từ VNPay và redirect về FE',
  })
  async vnpayCallback(
    @Query() query: Record<string, string>,
    @Res() res: Response, // Inject Response object vào đây
  ) {
    try {
      // 1. Backend xử lý logic kiểm tra chữ ký, lưu DB, bắn notification...
      await this.paymentService.processVnPayCallback(query);

      // 2. Tạo URL chuyển hướng về trang thông báo của Frontend
      // Đưa các thông tin cần thiết lên query param để FE bóc tách ra hiển thị
      const targetFeUrl = new URL(
        'https://api.horse-racing.io.vn/payment-result',
      );
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
      // Trường hợp lỗi chữ ký hoặc logic (BadRequestException) ném ra từ service
      // Chuyển hướng về FE với mã lỗi để hiển thị trang thất bại công khai thay vì crash trang trắng
      const failureFeUrl = `https://api.horse-racing.io.vn/payment-result?vnp_ResponseCode=99&vnp_TxnRef=${query['vnp_TxnRef'] || ''}`;
      return res.redirect(failureFeUrl);
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
}
