import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { HorseRepository } from './horse.repository';
import { RawResultRepository } from '../raw-result/raw-result.repository';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import { ResponseHorseDto } from './dto/response-horse.dto';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';

@Injectable()
export class HorseService {
  constructor(
    private readonly horseRepository: HorseRepository,
    private readonly rawResultRepository: RawResultRepository,
  ) {}

  private toResponse(data: any) {
    return plainToInstance(ResponseHorseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createHorse(
    dto: CreateHorseDto,
    userId: string,
  ): Promise<ResponseHorseDto> {
    const horse = await this.horseRepository.createHorse({
      ...dto,
      userId: new Types.ObjectId(userId),
    });
    return this.toResponse(horse);
  }

  async findAllHorses(): Promise<ResponseHorseDto[]> {
    const horses = await this.horseRepository.findAllHorse();
    return horses.map((h) => this.toResponse(h));
  }

  async getHorseDashboardStatistics(): Promise<{
    totalHorses: number;
    statuses: Record<string, number>;
  }> {
    const stats = await this.horseRepository.getHorseStats();

    // Kết quả của $facet luôn là mảng chứa 1 phần tử đầu tiên
    const horseAgg = stats[0];

    const statuses = horseAgg.byStatus.reduce<Record<string, number>>(
      (acc, curr) => {
        // Ép kiểu _id thành string, nếu null/undefined sẽ là "unknown"
        const statusKey = curr._id ? String(curr._id) : 'UNKNOWN';
        acc[statusKey] = curr.count;
        return acc;
      },
      {},
    );

    return {
      totalHorses: horseAgg.total[0]?.count || 0,
      statuses,
    };
  }

  async findAllMyHorses(userId: string): Promise<ResponseHorseDto[]> {
    const horses = await this.horseRepository.findAllMyHorse(userId);
    return horses.map((h) => this.toResponse(h));
  }

  async findOneHorse(id: string): Promise<ResponseHorseDto> {
    const horse = await this.horseRepository.findOneHorse({ _id: id });
    if (!horse) throw new NotFoundException('Horse not found');

    const rawResults = await this.rawResultRepository.findByHorseId(id);

    const horseObj: any = { ...horse };
    horseObj.stats = {
      winRate: horse.winRate ?? 0,
      totalWin: horse.totalWin ?? 0,
      totalRace: horse.totalRace ?? 0,
    };
    horseObj.historyRace = rawResults;

    return this.toResponse(horseObj);
  }

  async updateHorse(
    id: string,
    dto: UpdateHorseDto,
    userId: string,
  ): Promise<ResponseHorseDto> {
    const horse = await this.horseRepository.findOneHorse({ _id: id });
    if (!horse) throw new NotFoundException('Horse not found');

    // Kiểm tra tính chính chủ: ID tài khoản yêu cầu phải khớp với userId lưu trên bản ghi ngựa
    // if (horse.userId.toString() !== userId) {
    //   throw new ForbiddenException(
    //     'Bạn không có quyền chỉnh sửa thông tin con ngựa này',
    //   );
    // }

    // Lấy ra chuỗi ID chuẩn từ object userId đã được populate
    const ownerIdStr =
      horse.userId?._id?.toString() || horse.userId?.toString();

    if (ownerIdStr !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa thông tin con ngựa này',
      );
    }

    const updated = await this.horseRepository.findHorseByIdAndUpdate(id, {
      ...dto,
    });
    return this.toResponse(updated);
  }

  async removeHorse(id: string, userId: string): Promise<{ message: string }> {
    const horse = await this.horseRepository.findOneHorse({ _id: id });
    if (!horse) throw new NotFoundException('Horse not found');

    if (horse.horseStatus !== HorseStatusEnum.IDLE)
      throw new BadRequestException(
        `Ngựa này đang ở trạng thái ${horse.horseStatus}, không thể xóa`,
      );

    // Kiểm tra tính chính chủ trước khi thực hiện xóa
    // if (horse.userId.toString() !== userId) {
    //   throw new ForbiddenException('Bạn không có quyền xóa con ngựa này');
    // }

    // Lấy ra chuỗi ID chuẩn từ object userId đã được populate
    const ownerIdStr =
      horse.userId?._id?.toString() || horse.userId?.toString();

    if (ownerIdStr !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa thông tin con ngựa này',
      );
    }

    await this.horseRepository.deleteHorse(id);
    return { message: 'Xóa ngựa thành công!' };
  }
}
