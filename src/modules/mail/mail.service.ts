import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  // Hàm dùng chung cho tất cả các loại mail
  async sendMail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`, // Tên file template truyền vào (welcome, bet-success...)
        context,
      });
      console.log(`[MailService] Đã gửi mail "${subject}" đến: ${to}`);
    } catch (error) {
      console.error('Lỗi gửi mail:', error);
      throw new InternalServerErrorException('Lỗi hệ thống gửi email.');
    }
  }

  // Giữ lại hàm này nhưng gọi qua hàm chung để code gọn hơn
  async sendWelcomeEmail(to: string, name: string) {
    return this.sendMail(to, 'Chào mừng bạn đến với GoldenHoof!', 'welcome', {
      name,
      email: to,
    });
  }

  // async sendVerificationEmail(to: string, name: string, otpCode: string) {
  //   return this.sendMail(
  //     to,
  //     'Mã xác thực đăng ký tài khoản PolyGo',
  //     'verify-email',
  //     {
  //       name,
  //       otpCode,
  //     },
  //   );
  // }
}
