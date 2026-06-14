import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OtpRepository } from './otp.repository';
import { UsersRepository } from '../user/user.repository';
import { MailService } from '../mail/mail.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { HashUtil } from 'src/utils/helpers';

@Injectable()
export class OtpService {
  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly userRepository: UsersRepository,
    private readonly mailService: MailService,
  ) {}

  // BƯỚC 1: Nhận Email và gửi mã OTP về hòm thư người dùng
  async requestResetPasswordOtp(dto: RequestOtpDto) {
    const emailLower = dto.email;

    // 1. Kiểm tra xem hệ thống có User mang Email này không
    const user = await this.userRepository.findOneUser({ email: emailLower });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }

    // 2. Vô hiệu hóa toàn bộ các mã OTP cũ trước đó của email này nếu chưa dùng
    await this.otpRepository.invalidateOldOtps(emailLower);

    // 3. Tự động sinh ngẫu nhiên chuỗi OTP 6 số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Thiết lập thời gian hết hạn (Hiện tại + 5 phút)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 5. Lưu thông tin OTP vào cơ sở dữ liệu
    await this.otpRepository.createOtp({
      userId: user._id,
      email: emailLower,
      code: otpCode,
      expiresAt,
    });

    // 6. Gửi Email thông qua MailService (Sử dụng template khôi phục mật khẩu)
    this.mailService
      .sendMail(
        emailLower,
        'Mã xác thực khôi phục mật khẩu - GoldenHoof',
        'forgot-password',
        {
          name: user.fullName,
          otpCode: otpCode,
        },
      )
      .catch((err) => {
        console.error(
          `[OtpService] Thất bại khi gửi mã OTP đến ${emailLower}:`,
          err,
        );
      });

    return {
      message: 'Mã xác thực OTP đã được gửi tới Email của bạn thành công',
    };
  }

  // BƯỚC 2: Nhập đồng thời cả OTP và mật khẩu mới để đổi mật khẩu luôn trong 1 Request
  async resetPassword(dto: ResetPasswordDto) {
    const emailLower = dto.email;

    // 1. Tìm và kiểm tra xem mã OTP có chính xác và còn hạn sử dụng hay không
    const validOtp = await this.otpRepository.findValidOtp(
      emailLower,
      dto.code,
    );
    if (!validOtp) {
      throw new BadRequestException(
        'Thao tác thất bại. Mã OTP không chính xác hoặc đã hết hạn',
      );
    }

    // 2. Lấy thông tin user có kèm password để tiến hành kiểm tra bảo mật
    const userWithPass =
      await this.userRepository.findOneUserWithPassword(emailLower);
    if (!userWithPass) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    // 3. Kiểm tra xem mật khẩu mới nhập vào có bị trùng lặp với mật khẩu cũ hay không
    const isSameAsOld = await HashUtil.compare(
      dto.newPassword,
      userWithPass.password,
    );
    if (isSameAsOld) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng khớp với mật khẩu hiện tại',
      );
    }

    // 4. Tiến hành băm mã hóa bảo mật cho mật khẩu mới
    const newHashedPassword = await HashUtil.hash(dto.newPassword);

    // 5. Cập nhật mật khẩu mới đè vào bảng User
    const userIdStr = userWithPass._id.toString();
    await this.userRepository.updatePassword(userIdStr, newHashedPassword);

    // 6. Đánh dấu mã OTP này đã được sử dụng thành công (Vô hiệu hóa hoàn toàn mã)
    await this.otpRepository.markAsUsed(validOtp._id);

    return { message: 'Đặt lại mật khẩu mới thành công!' };
  }
}
