import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JockeyLicenseRepository } from './jockey-license.repository';
import { plainToInstance } from 'class-transformer';
import { ResponseJockeyLicenseDto } from './dto/response-jockey-license.dto';
import { CreateJockeyLicenseDto } from './dto/create-jockey-license.dto';
import { Model, Types } from 'mongoose';
import { JockeyProfile } from '../user/schemas/jockey-profile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateJockeyLicenseDto } from './dto/update-jockey-license.dto';
import { JockeyLicense } from './schemas/jockey-license.schema';

@Injectable()
export class JockeyLicenseService {
  constructor(
    private readonly licenseRepository: JockeyLicenseRepository,
    @InjectModel('JockeyProfile')
    private readonly jockeyProfileModel: Model<JockeyProfile>,
  ) {}

  /**
   * Hàm helper tập trung xử lý chuyển đổi dữ liệu thô sang DTO
   * Hỗ trợ tự động chuyển đổi cả Object đơn lẻ và Mảng Object
   */
  public toResponse(data: any): any {
    if (!data) return data;
    return plainToInstance(ResponseJockeyLicenseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Hàm static phục vụ riêng cho ResponseUserDto (hoặc các DTO ngoài module)
   * khi cần bóc tách mảng dữ liệu ảo đã qua populate
   */
  public static transformLicenses(
    rawLicenses: any,
  ): ResponseJockeyLicenseDto[] {
    if (!rawLicenses || !Array.isArray(rawLicenses)) {
      return [];
    }
    return plainToInstance(ResponseJockeyLicenseDto, rawLicenses, {
      excludeExtraneousValues: true,
    });
  }

  // Tạo mới chứng chỉ và xử lý ép kiểu format ngày
  async create(
    userId: string,
    dto: CreateJockeyLicenseDto,
  ): Promise<ResponseJockeyLicenseDto> {
    const jockeyProfile = await this.jockeyProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!jockeyProfile) {
      throw new NotFoundException(
        'Không tìm thấy thông tin hồ sơ Jockey của tài khoản này',
      );
    }
    const parsedDate = new Date(dto.racingStartDate);

    // Kiểm tra tính hợp lệ của chuỗi ngày gửi lên
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        'Định dạng ngày racingStartDate không hợp lệ (YYYY-MM-DD)',
      );
    }

    const newLicense = await this.licenseRepository.createLicense({
      // jockeyProfileId: new Types.ObjectId(dto.jockeyProfileId),
      jockeyProfileId: jockeyProfile._id,
      licenseCode: dto.licenseCode,
      licenseUrl: dto.licenseUrl,
      racingStartDate: parsedDate, // Đã format chuẩn sang Date Object cho MongoDB
    });

    // Trả về dữ liệu đã map qua DTO sạch sẽ
    return this.toResponse(newLicense);
  }

  async getMyLicenses(userId: string): Promise<ResponseJockeyLicenseDto[]> {
    const jockeyProfile = await this.jockeyProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!jockeyProfile) {
      throw new NotFoundException('Không tìm thấy thông tin hồ sơ nài ngựa');
    }

    const listLicenses = await this.licenseRepository.findByJockeyProfileId(
      jockeyProfile._id.toString(),
    );

    return this.toResponse(listLicenses) as ResponseJockeyLicenseDto[];
  }

  // Lấy danh sách thô từ repo
  async getLicensesByProfile(
    jockeyProfileId: string,
  ): Promise<ResponseJockeyLicenseDto[]> {
    const listLicenses =
      await this.licenseRepository.findByJockeyProfileId(jockeyProfileId);
    if (!listLicenses || listLicenses.length === 0) {
      throw new NotFoundException('Không tìm thấy chứng chỉ nào cho hồ sơ này');
    }

    return this.toResponse(listLicenses) as ResponseJockeyLicenseDto[];
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateJockeyLicenseDto,
  ): Promise<ResponseJockeyLicenseDto> {
    const jockeyProfile = await this.jockeyProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!jockeyProfile) {
      throw new NotFoundException('Không tìm thấy thông tin hồ sơ nài ngựa');
    }

    // Xác thực chứng chỉ này thực sự thuộc về tài khoản đang yêu cầu sửa
    const license = await this.licenseRepository.findOneByProfile(
      id,
      jockeyProfile._id,
    );
    if (!license) {
      throw new NotFoundException(
        'Không tìm thấy chứng chỉ hoặc bạn không có quyền chỉnh sửa',
      );
    }

    const updateData: Partial<JockeyLicense> = {
      licenseCode: dto.licenseCode,
      licenseUrl: dto.licenseUrl,
    };

    // Nếu có cập nhật ngày, xử lý chuyển đổi và kiểm tra tính hợp lệ
    if (dto.racingStartDate) {
      const parsedDate = new Date(dto.racingStartDate);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException(
          'Định dạng ngày racingStartDate không hợp lệ (YYYY-MM-DD)',
        );
      }
      updateData.racingStartDate = parsedDate;
    }

    const updatedLicense = await this.licenseRepository.updateLicense(
      id,
      updateData,
    );
    return this.toResponse(updatedLicense);
  }

  // Xóa chứng chỉ
  async remove(id: string): Promise<{ message: string }> {
    await this.licenseRepository.deleteLicense(id);
    return { message: 'Xóa chứng chỉ thành công' };
  }
}
