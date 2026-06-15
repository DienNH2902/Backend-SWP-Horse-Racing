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

  async sendForgotPasswordEmail(to: string, name: string, otpCode: string) {
    return this.sendMail(
      to,
      'Mã xác thực khôi phục mật khẩu tài khoản GoldenHoof',
      'forgot-password',
      {
        name,
        otpCode,
      },
    );
  }

  async sendGeneratedPasswordEmail(
    email: string,
    name: string,
    passwordString: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: '[GoldenHoof] Thông báo cấp mật khẩu tài khoản thành viên',
      template: './receive-password', // Tên file template chứa mã HTML phía trên của bạn
      context: {
        name: name,
        password: passwordString, // Truyền trực tiếp chuỗi mật khẩu thô chưa băm ra mail
      },
    });
  }
}
