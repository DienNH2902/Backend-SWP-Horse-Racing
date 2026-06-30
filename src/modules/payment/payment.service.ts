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
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
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
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalRepository } from './withdrawal.repository';
import { ApproveWithdrawalDto } from './dto/approval-withdrawal.dto';
import { WithdrawalStatusEnum } from 'src/constants/withdrawalStatusEnum.enum';
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
    private readonly withdrawalRepository: WithdrawalRepository,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(HorseOwnerProfile.name)
    private readonly horseOwnerModel: Model<HorseOwnerProfileDocument>,
    @InjectModel(JockeyProfile.name)
    private readonly jockeyModel: Model<JockeyProfile>,
    @InjectConnection() private readonly connection: Connection,
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

  async findAllMyRequest(id: string): Promise<any> {
    const requests = await this.withdrawalRepository.findAllMyRequest(id);
    return requests;
  }

  async requestWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new BadRequestException('Người dùng không tồn tại');
    if (user.role !== RoleEnum.HORSE_OWNER && user.role !== RoleEnum.JOCKEY) {
      throw new BadRequestException(
        'Chỉ Chủ ngựa và Nài ngựa mới có thể rút tiền',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      if (user.role === RoleEnum.JOCKEY) {
        const profile = await this.jockeyModel
          .findOne({
            userId: new Types.ObjectId(user._id),
          })
          .session(session);

        if (!profile) throw new NotFoundException(`Không tìm thấy hồ sơ`);

        if (profile.balance < dto.amount) {
          throw new BadRequestException(
            'Số dư tài khoản khả dụng không đủ để thực hiện rút tiền',
          );
        }

        await this.jockeyModel.updateOne(
          { userId: new Types.ObjectId(userId) },
          { $inc: { balance: -dto.amount, heldBalance: dto.amount } },
          { session },
        );
      }

      if (user.role === RoleEnum.HORSE_OWNER) {
        const profile = await this.horseOwnerModel
          .findOne({
            userId: new Types.ObjectId(user._id),
          })
          .session(session);

        if (!profile) throw new NotFoundException(`Không tìm thấy hồ sơ`);

        if (profile.balance < dto.amount) {
          throw new BadRequestException(
            'Số dư tài khoản khả dụng không đủ để thực hiện rút tiền',
          );
        }

        await this.horseOwnerModel.updateOne(
          { userId: new Types.ObjectId(userId) },
          { $inc: { balance: -dto.amount, heldBalance: dto.amount } },
          { session },
        );
      }

      // 2. Lưu yêu cầu rút tiền vào danh sách chờ xử lý (PENDING)
      await this.withdrawalRepository.create(
        {
          userId: new Types.ObjectId(userId),
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          amount: dto.amount,
          content: dto.content || '',
        },
        session,
      );

      // 3. Tạo Transaction ghi nhận biến động đóng băng số tiền
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(userId),
        receiverId: null,
        content: `Yêu cầu rút tiền về ngân hàng: Đóng băng tạm thời - ${dto.amount} VNĐ`,
        amount: dto.amount,
        type: TransactionTypeEnum.WITHDRAWAL,
      });

      // 4. Tạo thông báo cho hệ thống
      await this.notificationRepository.create({
        userId: new Types.ObjectId(userId),
        type: NotificationTypeEnum.DEPOSIT_SUCCESS, // Tạo/Tùy biến Enum thông báo rút tiền của bạn nếu có
        title: NotificationTitleEnum.CREATE_WITHDRAW_SUCCESS,
        content: `Hệ thống đã tiếp nhận yêu cầu rút ${dto.amount} VNĐ của bạn và đang chờ Admin duyệt.`,
        isRead: false,
      });

      await session.commitTransaction();
      return {
        success: true,
        message:
          'Gửi yêu cầu rút tiền thành công, vui lòng chờ hệ thống xét duyệt.',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ==========================================
  // LUỒNG ADMIN PHÊ DUYỆT RÚT TIỀN THÀNH CÔNG
  // ==========================================
  async approveWithdrawal(requestId: string, dto: ApproveWithdrawalDto) {
    const request = await this.withdrawalRepository.findById(requestId);
    if (!request || request.status !== WithdrawalStatusEnum.PENDING) {
      throw new BadRequestException(
        'Yêu cầu rút tiền không tồn tại hoặc đã được xử lý từ trước',
      );
    }

    const user = await this.userModel.findById(request.userId).lean();
    if (!user)
      throw new BadRequestException(
        'Không tìm thấy người dùng sở hữu yêu cầu này',
      );

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Cập nhật trạng thái đơn rút thành APPROVED
      request.status = WithdrawalStatusEnum.APPROVED;
      request.adminNote = dto.adminNote || 'Đã phê duyệt hoàn tất chuyển khoản';
      await request.save({ session });

      if (user.role === RoleEnum.JOCKEY) {
        const profile = await this.jockeyModel
          .findOne({
            userId: new Types.ObjectId(user._id),
          })
          .session(session);

        if (!profile) throw new NotFoundException(`Không tìm thấy hồ sơ`);

        await this.jockeyModel.updateOne(
          { userId: request.userId },
          { $inc: { heldBalance: -request.amount } },
          { session },
        );
      }

      if (user.role === RoleEnum.HORSE_OWNER) {
        const profile = await this.horseOwnerModel
          .findOne({
            userId: new Types.ObjectId(user._id),
          })
          .session(session);

        if (!profile) throw new NotFoundException(`Không tìm thấy hồ sơ`);

        await this.horseOwnerModel.updateOne(
          { userId: request.userId },
          { $inc: { heldBalance: -request.amount } },
          { session },
        );
      }

      // 3. Ghi nhận Transaction lịch sử giải ngân ra cổng ngân hàng ngoài đời thực
      await this.transactionRepository.create({
        senderId: request.userId,
        receiverId: null,
        content: `Giải ngân rút tiền thành công: ${request.bankName} - STK: ${request.accountNumber}`,
        amount: request.amount,
        type: TransactionTypeEnum.WITHDRAWAL,
      });

      // 4. Bắn Notification thông báo tin vui cho User
      await this.notificationRepository.create({
        userId: request.userId,
        type: NotificationTypeEnum.WITHDRAW_SUCCESS,
        title: NotificationTitleEnum.WITHDRAW_SUCCESS,
        content: `Yêu cầu rút ${request.amount} VNĐ của bạn đã được phê duyệt. Tiền đã được chuyển vào số tài khoản ${request.accountNumber}.`,
        isRead: false,
      });

      await session.commitTransaction();
      return {
        success: true,
        message: 'Phê duyệt giải ngân rút tiền thành công',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ==========================================
  // LUỒNG ADMIN TỪ CHỐI YÊU CẦU RÚT TIỀN
  // ==========================================
  async rejectWithdrawal(requestId: string, dto: ApproveWithdrawalDto) {
    const request = await this.withdrawalRepository.findById(requestId);
    if (!request || request.status !== WithdrawalStatusEnum.PENDING) {
      throw new BadRequestException(
        'Yêu cầu rút tiền không tồn tại hoặc đã được xử lý từ trước',
      );
    }

    const user = await this.userModel.findById(request.userId).lean();
    if (!user)
      throw new BadRequestException(
        'Không tìm thấy người dùng sở hữu yêu cầu này',
      );

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Cập nhật trạng thái đơn rút thành REJECTED
      request.status = WithdrawalStatusEnum.REJECTED;
      request.adminNote =
        dto.adminNote || 'Yêu cầu bị từ chối do thông tin không hợp lệ';
      await request.save({ session });

      if (user.role === RoleEnum.JOCKEY) {
        const profile = await this.jockeyModel
          .findOne({
            userId: new Types.ObjectId(user._id),
          })
          .session(session);

        if (!profile) throw new NotFoundException(`Không tìm thấy hồ sơ`);

        await this.jockeyModel.updateOne(
          { userId: request.userId },
          { $inc: { heldBalance: -request.amount, balance: request.amount } },
          { session },
        );
      }

      if (user.role === RoleEnum.HORSE_OWNER) {
        const profile = await this.horseOwnerModel
          .findOne({
            userId: new Types.ObjectId(user._id),
          })
          .session(session);

        if (!profile) throw new NotFoundException(`Không tìm thấy hồ sơ`);

        await this.horseOwnerModel.updateOne(
          { userId: request.userId },
          { $inc: { heldBalance: -request.amount, balance: request.amount } },
          { session },
        );
      }

      // 3. Ghi nhận Transaction hoàn trả lại tiền đóng băng
      await this.transactionRepository.create({
        senderId: null,
        receiverId: request.userId,
        content: `Yêu cầu rút tiền thất bại: Giải phóng điểm đóng băng về ví chính`,
        amount: request.amount,
        type: TransactionTypeEnum.REFUND,
      });

      // 4. Bắn Notification giải trình lý do từ chối
      await this.notificationRepository.create({
        userId: request.userId,
        type: NotificationTypeEnum.WITHDRAW_FAILED,
        title: NotificationTitleEnum.WITHDRAW_FAILED,
        content: `Yêu cầu rút ${request.amount} VNĐ bị từ chối. Lý do: ${request.adminNote}. Số tiền đã được hoàn trả về ví khả dụng của bạn.`,
        isRead: false,
      });

      await session.commitTransaction();
      return {
        success: true,
        message: 'Đã hủy và hoàn trả tiền về ví cho người dùng thành công',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Admin xem chi tiết thông tin đơn rút + user profile để kiểm tra chéo trước khi bấm nút duyệt
  async getWithdrawalDetail(requestId: string) {
    const detail = (await this.withdrawalRepository.findByIdWithUserDetails(
      requestId,
    )) as Record<string, any> | null;

    if (!detail) {
      throw new BadRequestException(
        'Không tìm thấy thông tin đơn yêu cầu rút tiền',
      );
    }
    return detail;
  }

  // Danh sách hiển thị toàn bộ lịch sử yêu cầu rút tiền trên CMS Admin
  async getAllWithdrawalRequests() {
    return this.withdrawalRepository.findAllRequests();
  }
}
