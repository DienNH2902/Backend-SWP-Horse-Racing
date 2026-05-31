import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { VnPayService } from './vnpay.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateVnPayPaymentDto } from './dto/create-vnpay-payment.dto';

@ApiTags('VNPay Production-Ready')
@Controller('vnpay')
export class VnPayController {
  constructor(private readonly vnPayService: VnPayService) {}

  // [THAY ĐỔI 3]: Đổi từ @Get('test-payment') thành @Post('create-payment') thực tế công việc
  @Post('create-payment')
  @ApiOperation({
    summary: 'Tạo đường link thanh toán VNPay chính thức từ Client',
  })
  createPayment(
    @Body() dto: CreateVnPayPaymentDto, // [THAY ĐỔI 4]: Đón nhận data động từ FE truyền lên thay vì fake data
    @Req() req: any,
  ) {
    const { referenceId, amount, bankCode } = dto;

    // Lấy IP của Client chuẩn xác phục vụ bảo mật giao dịch
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    // Gọi service xử lý sinh link dựa trên tham số thực tế
    const paymentUrl = this.vnPayService.createPaymentUrl(
      referenceId,
      amount,
      clientIp,
      bankCode,
    );

    return {
      success: true,
      message: 'Khởi tạo link thanh toán VNPay thành công',
      statusCode: HttpStatus.CREATED,
      paymentUrl,
    };
  }

  // 2. Endpoint xử lý luồng Callback quay về
  @Get('callback')
  @ApiOperation({
    summary: 'Webhook nhận và phân tích phản hồi từ kết quả VNPay',
  })
  vnpayCallback(@Query() query: Record<string, string>) {
    const result = this.vnPayService.verifyCallback(query);

    if (!result.isValid) {
      return {
        success: false,
        message: 'Chữ ký giao dịch không hợp lệ. Xác thực thất bại!',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }

    if (result.responseCode === '00') {
      // [THAY ĐỔI 5]: Thiết kế sẵn cấu trúc sạch trả về cho Frontend nhận kết quả điều hướng giao diện
      return {
        success: true,
        message: 'Thanh toán đơn hàng thành công',
        statusCode: HttpStatus.OK,
        referenceId: result.txnRef,
        vnpayResponseCode: result.responseCode,
      };
    } else {
      return {
        success: false,
        message: 'Giao dịch không thành công hoặc bị khách hàng hủy bỏ',
        statusCode: HttpStatus.BAD_REQUEST,
        referenceId: result.txnRef,
        vnpayResponseCode: result.responseCode,
      };
    }
  }
}
