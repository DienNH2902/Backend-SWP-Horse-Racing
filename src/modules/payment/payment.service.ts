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
import { NotificationTypeEnum } from 'src/constants/notificationEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';

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

    const referenceId = `${userId}_${Date.now()}`;
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

    const { txnRef, responseCode, amount } = result;
    const userId = txnRef.split('_')[0];

    const isProcessed = await this.transactionRepository.checkExistsByContent(
      `VNPay Deposit: ${txnRef}`,
    );
    if (isProcessed)
      return { success: true, message: 'Giao dịch đã được xử lý trước đó' };

    if (responseCode === '00') {
      const user = await this.userModel.findById(userId).lean();
      if (!user) throw new BadRequestException('Người dùng không tồn tại');

      if (user.role === RoleEnum.HORSE_OWNER) {
        await this.horseOwnerModel.findOneAndUpdate(
          { userId: new Types.ObjectId(userId) },
          { $inc: { balance: amount } },
        );
      } else if (user.role === RoleEnum.JOCKEY) {
        await this.jockeyModel.findOneAndUpdate(
          { userId: new Types.ObjectId(userId) },
          { $inc: { balance: amount } },
        );
      }

      await this.transactionRepository.create({
        senderId: new Types.ObjectId(userId),
        receiverId: null,
        content: `VNPay Deposit: ${txnRef}`,
        amount,
        type: TransactionTypeEnum.DEPOSIT,
      });

      await this.notificationRepository.create({
        userId: new Types.ObjectId(userId),
        type: NotificationTypeEnum.DEPOSIT_SUCCESS, // Dùng Enum thay cho 'deposit_success'
        title: NotificationTitleEnum.DEPOSIT_SUCCESS, // Dùng Enum thay cho 'Nạp tiền thành công'
        content: `Bạn đã nạp thành công ${amount} VNĐ vào tài khoản.`,
        isRead: false,
      });

      return { success: true, message: 'Nạp tiền thành công', amount };
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
