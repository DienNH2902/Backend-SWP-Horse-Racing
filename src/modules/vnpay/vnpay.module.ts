import { Global, Module } from '@nestjs/common';
import { VnPayService } from './vnpay.service';
import { VnPayController } from './vnpay.controller';

@Global() // Khai báo global
@Module({
  controllers: [VnPayController],
  providers: [VnPayService],
  exports: [VnPayService], // Export Service ra bên ngoài
})
export class VnPayModule {}
