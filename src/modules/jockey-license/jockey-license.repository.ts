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

  //Tìm tất cả License
  async findAllLicense(): Promise<JockeyLicense[]> {
    return await this.licenseModel.find();
  }

  // Tìm danh sách chứng chỉ theo ID của Jockey Profile
  async findByJockeyProfileId(
    jockeyProfileId: string,
  ): Promise<JockeyLicense[]> {
    return await this.licenseModel
      .find({ jockeyProfileId: new Types.ObjectId(jockeyProfileId) })
      .exec();
  }

  // Tìm một chứng chỉ cụ thể thuộc về một Profile
  async findOneByProfile(
    id: string,
    jockeyProfileId: Types.ObjectId,
  ): Promise<JockeyLicense | null> {
    return await this.licenseModel
      .findOne({
        _id: new Types.ObjectId(id),
        jockeyProfileId,
      })
      .exec();
  }

  // Cập nhật chứng chỉ hành nghề và trả về dữ liệu mới nhất
  async updateLicense(
    id: string,
    data: Partial<JockeyLicense>,
  ): Promise<JockeyLicense | null> {
    return await this.licenseModel
      .findByIdAndUpdate(id, data, { returnDocument: 'after' })
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
