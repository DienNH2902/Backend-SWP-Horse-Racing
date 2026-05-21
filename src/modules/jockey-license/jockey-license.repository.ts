import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JockeyLicense } from './schemas/jockey-license.schema';

@Injectable()
export class JockeyLicenseRepository {
  constructor(
    @InjectModel(JockeyLicense.name)
    private readonly licenseModel: Model<JockeyLicense>,
  ) {}

  // Tìm danh sách chứng chỉ theo ID của Jockey Profile
  async findByJockeyProfileId(
    jockeyProfileId: string,
  ): Promise<JockeyLicense[]> {
    return await this.licenseModel
      .find({ jockeyProfileId: new Types.ObjectId(jockeyProfileId) })
      .exec();
  }

  // Tạo mới một chứng chỉ cho Jockey
  async createLicense(data: Partial<JockeyLicense>): Promise<JockeyLicense> {
    return await this.licenseModel.create(data);
  }

  // Xóa chứng chỉ khi cần
  async deleteLicense(id: string | Types.ObjectId): Promise<any> {
    return await this.licenseModel.findByIdAndDelete(id).exec();
  }
}
