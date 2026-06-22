import { Injectable } from '@nestjs/common';
import { PointsTransactionRepository } from './points-transaction.repository';
import { CreatePointsTransactionDto } from './dto/create-points-transaction.dto';
import { ResponsePointsTransactionDto } from './dto/response-points-transaction.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PointsTransactionService {
  constructor(private readonly transactionRepo: PointsTransactionRepository) {}

  async logTransaction(
    dto: CreatePointsTransactionDto,
  ): Promise<ResponsePointsTransactionDto> {
    const transaction = await this.transactionRepo.createTransaction(dto);
    return plainToInstance(ResponsePointsTransactionDto, transaction, {
      excludeExtraneousValues: true,
    });
  }

  async getHistoryByUserId(
    userId: string,
  ): Promise<ResponsePointsTransactionDto[]> {
    const list = await this.transactionRepo.findByUserId(userId);
    return list.map((item) =>
      plainToInstance(ResponsePointsTransactionDto, item, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
