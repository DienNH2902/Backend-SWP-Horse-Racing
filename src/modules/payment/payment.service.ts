// import { Injectable, BadRequestException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import { plainToInstance } from 'class-transformer';
// import { VnPayService } from './vnpay.service';
// import { TransactionRepository } from './transaction.repository';
// import { NotificationRepository } from '../notification/notification.repository';
// import { User, UserDocument } from '../user/schemas/user.schema';
// import {
//   HorseOwnerProfile,
//   HorseOwnerProfileDocument,
// } from '../user/schemas/horse-owner-profile.schema';
// import { JockeyProfile } from '../user/schemas/jockey-profile.schema';
// import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
// import { RoleEnum } from 'src/constants/roleEnum.enum';
// import { ResponseTransactionDto } from './dto/response-transaction.dto';

// @Injectable()
// export class PaymentService {
//   constructor(
//     private readonly vnPayService: VnPayService,
//     private readonly transactionRepository: TransactionRepository,
//     private readonly notificationRepository: NotificationRepository,
//     @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
//     @InjectModel(HorseOwnerProfile.name)
//     private readonly horseOwnerModel: Model<HorseOwnerProfileDocument>,
//     @InjectModel(JockeyProfile.name)
//     private readonly jockeyModel: Model<JockeyProfile>,
//   ) {}

//   private toResponse(data: any): ResponseTransactionDto {
//     return plainToInstance(ResponseTransactionDto, data, {
//       excludeExtraneousValues: true,
//     });
//   }

//   async createDepositUrl(
//     userId: string,
//     amount: number,
//     ipAddr: string,
//     bankCode?: string,
//   ): Promise<string> {
//     const user = await this.userModel.findById(userId).lean();
//     if (!user) throw new BadRequestException('Người dùng không tồn tại');
//     if (user.role !== RoleEnum.HORSE_OWNER && user.role !== RoleEnum.JOCKEY) {
//       throw new BadRequestException(
//         'Chỉ Chủ ngựa và Nài ngựa mới có thể nạp tiền',
//       );
//     }

//     const referenceId = `${userId}_${Date.now()}`;
//     return this.vnPayService.createPaymentUrl(
//       referenceId,
//       amount,
//       ipAddr,
//       bankCode,
//     );
//   }

//   async processVnPayCallback(query: Record<string, string>): Promise<any> {
//     const result = this.vnPayService.verifyCallback(query);
//     if (!result.isValid) throw new BadRequestException('Chữ ký không hợp lệ');

//     const { txnRef, responseCode, amount } = result;
//     const userId = txnRef.split('_')[0];

//     const isProcessed = await this.transactionRepository.checkExistsByContent(
//       `VNPay Deposit: ${txnRef}`,
//     );
//     if (isProcessed)
//       return { success: true, message: 'Giao dịch đã được xử lý trước đó' };

//     if (responseCode === '00') {
//       const user = await this.userModel.findById(userId).lean();
//       if (!user) throw new BadRequestException('Người dùng không tồn tại');

//       if (user.role === RoleEnum.HORSE_OWNER) {
//         await this.horseOwnerModel.findOneAndUpdate(
//           { userId: new Types.ObjectId(userId) },
//           { $inc: { balance: amount } },
//         );
//       } else if (user.role === RoleEnum.JOCKEY) {
//         await this.jockeyModel.findOneAndUpdate(
//           { userId: new Types.ObjectId(userId) },
//           { $inc: { balance: amount } },
//         );
//       }

//       await this.transactionRepository.create({
//         senderId: new Types.ObjectId(userId),
//         receiverId: null,
//         content: `VNPay Deposit: ${txnRef}`,
//         amount,
//         type: TransactionTypeEnum.DEPOSIT,
//       });

//       await this.notificationRepository.create({
//         userId: new Types.ObjectId(userId),
//         type: 'deposit_success',
//         title: 'Nạp tiền thành công',
//         content: `Bạn đã nạp thành công ${amount} VNĐ vào tài khoản.`,
//         isRead: false,
//       });

//       return { success: true, message: 'Nạp tiền thành công', amount };
//     }

//     return { success: false, message: 'Giao dịch thất bại hoặc bị hủy' };
//   }

//   async getMyTransactions(userId: string): Promise<ResponseTransactionDto[]> {
//     const transactions = await this.transactionRepository.findByUserId(userId);
//     return transactions.map((t) => this.toResponse(t));
//   }

//   async getAllTransactions(): Promise<ResponseTransactionDto[]> {
//     const transactions = await this.transactionRepository.findAll();
//     return transactions.map((t) => this.toResponse(t));
//   }
// }
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { VnPayService } from './vnpay.service';
import { TransactionRepository } from './transaction.repository';
import { NotificationRepository } from '../notification/notification.repository';
import { User, UserDocument } from '../user/schemas/user.schema';
import {
  HorseOwnerProfile,
  HorseOwnerProfileDocument,
} from '../user/schemas/horse-owner-profile.schema';
import { JockeyProfile } from '../user/schemas/jockey-profile.schema';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { ResponseTransactionDto } from './dto/response-transaction.dto';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
// import { TransactionTitleEnum } from 'src/constants/transactionTitleEnum.enum';

export interface VnPayCallbackResponse {
  success: boolean;
  message: string;
  amount?: number;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly vnPayService: VnPayService,
    private readonly transactionRepository: TransactionRepository,
    private readonly notificationRepository: NotificationRepository,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(HorseOwnerProfile.name)
    private readonly horseOwnerModel: Model<HorseOwnerProfileDocument>,
    @InjectModel(JockeyProfile.name)
    private readonly jockeyModel: Model<JockeyProfile>,
  ) {}

  private toResponse(data: unknown): ResponseTransactionDto {
    return plainToInstance(ResponseTransactionDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createDepositUrl(
    userId: string,
    amount: number,
    ipAddr: string,
    bankCode?: string,
  ): Promise<string> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new BadRequestException('Người dùng không tồn tại');
    if (user.role !== RoleEnum.HORSE_OWNER && user.role !== RoleEnum.JOCKEY) {
      throw new BadRequestException(
        'Chỉ Chủ ngựa và Nài ngựa mới có thể nạp tiền',
      );
    }

    // const referenceId = `${userId}_${Date.now()}`;

    /**
     * UPDATE BẢO MẬT: Nhúng thẳng amount vào txnRef theo định dạng: userId_amount_timestamp
     * Điều này giúp chúng ta kiểm tra được số tiền gốc mà không cần tạo transaction nháp trong DB.
     */
    const referenceId = `${userId}_${amount}_${Date.now()}`;
    return this.vnPayService.createPaymentUrl(
      referenceId,
      amount,
      ipAddr,
      bankCode,
    );
  }

  async processVnPayCallback(
    query: Record<string, string>,
  ): Promise<VnPayCallbackResponse> {
    const result = this.vnPayService.verifyCallback(query);
    if (!result.isValid) throw new BadRequestException('Chữ ký không hợp lệ');

    const { txnRef, responseCode, amount: callbackAmount } = result;
    // const userId = txnRef.split('_')[0];

    /**
     * UPDATE BẢO MẬT: Bóc tách referenceId mới để lấy userId và originalAmount
     */
    const parts = txnRef.split('_');
    const userId = parts[0];
    const originalAmount = parseInt(parts[1] || '0', 10);

    /**
     * 1 - KHẮC PHỤC: Đối chiếu số tiền trả về từ VNPay với số tiền gốc user yêu cầu nạp
     */
    if (callbackAmount !== originalAmount) {
      throw new BadRequestException(
        'Số tiền thanh toán không khớp với yêu cầu khởi tạo',
      );
    }

    // const isProcessed = await this.transactionRepository.checkExistsByContent(
    //   `VNPay Deposit: ${txnRef}`,
    // );

    /**
     * 2 - KHẮC PHỤC: Đồng bộ chuỗi kiểm tra trùng lặp giao dịch (Idempotency)
     * Đảm bảo chuỗi truyền vào checkExistsByContent khớp chính xác với trường 'content' được lưu ở dưới.
     */
    const transactionContent = `VNPay Deposit: ${txnRef}`;
    const isProcessed =
      await this.transactionRepository.checkExistsByContent(transactionContent);
    if (isProcessed)
      return { success: true, message: 'Giao dịch đã được xử lý trước đó' };

    if (responseCode === '00') {
      const user = await this.userModel.findById(userId).lean();
      if (!user) throw new BadRequestException('Người dùng không tồn tại');

      if (user.role === RoleEnum.HORSE_OWNER) {
        await this.horseOwnerModel.findOneAndUpdate(
          { userId: new Types.ObjectId(userId) },
          { $inc: { balance: callbackAmount } },
        );
      } else if (user.role === RoleEnum.JOCKEY) {
        await this.jockeyModel.findOneAndUpdate(
          { userId: new Types.ObjectId(userId) },
          { $inc: { balance: callbackAmount } },
        );
      }

      /**
       * 3 - KHẮC PHỤC: Lưu 'transactionContent' (có chứa txnRef duy nhất) vào DB
       * thay vì dùng Enum chung chung để hàm checkExistsByContent phía trên hoạt động chính xác.
       */
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(userId),
        receiverId: null,
        content: transactionContent,
        amount: callbackAmount,
        type: TransactionTypeEnum.DEPOSIT,
      });

      await this.notificationRepository.create({
        userId: new Types.ObjectId(userId),
        type: NotificationTypeEnum.DEPOSIT_SUCCESS, // Dùng Enum thay cho 'deposit_success'
        title: NotificationTitleEnum.DEPOSIT_SUCCESS, // Dùng Enum thay cho 'Nạp tiền thành công'
        content: `Bạn đã nạp thành công ${callbackAmount} VNĐ vào tài khoản.`,
        isRead: false,
      });

      return {
        success: true,
        message: 'Nạp tiền thành công',
        amount: callbackAmount,
      };
    }

    return { success: false, message: 'Giao dịch thất bại hoặc bị hủy' };
  }

  async getMyTransactions(userId: string): Promise<ResponseTransactionDto[]> {
    const transactions = await this.transactionRepository.findByUserId(userId);
    return transactions.map((t) => this.toResponse(t));
  }

  async getAllTransactions(): Promise<ResponseTransactionDto[]> {
    const transactions = await this.transactionRepository.findAll();
    return transactions.map((t) => this.toResponse(t));
  }
}
