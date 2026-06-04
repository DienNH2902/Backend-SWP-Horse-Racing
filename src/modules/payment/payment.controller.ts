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
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService, VnPayCallbackResponse } from './payment.service';
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
  @ApiOperation({ summary: 'Webhook xử lý kết quả trả về từ VNPay' })
  async vnpayCallback(@Query() query: Record<string, string>) {
    const result: VnPayCallbackResponse =
      await this.paymentService.processVnPayCallback(query);
    return {
      statusCode: result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      ...result,
    };
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
