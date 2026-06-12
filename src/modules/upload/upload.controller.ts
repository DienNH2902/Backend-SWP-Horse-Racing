// import {
//   Controller,
//   Post,
//   UseInterceptors,
//   UploadedFile,
//   BadRequestException,
// } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { extname } from 'path';

// @Controller('upload')
// export class UploadController {
//   @Post('avatar')
//   @UseInterceptors(
//     FileInterceptor('file', {
//       storage: diskStorage({
//         // Định nghĩa thư mục lưu file trên đĩa cứng VPS
//         destination: './uploads/avatars',
//         filename: (req, file, callback) => {
//           // Tạo tên file duy nhất: avatar-timestamp-random.png
//           const uniqueSuffix =
//             Date.now() + '-' + Math.round(Math.random() * 1e9);
//           const ext = extname(file.originalname);
//           callback(null, `avatar-${uniqueSuffix}${ext}`);
//         },
//       }),
//       fileFilter: (req, file, callback) => {
//         // Chỉ cho phép upload các định dạng ảnh phổ biến
//         if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
//           return callback(
//             new BadRequestException(
//               'Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!',
//             ),
//             false,
//           );
//         }
//         callback(null, true);
//       },
//       limits: {
//         fileSize: 5 * 1024 * 1024, // Giới hạn file tối đa 5MB (Bảo vệ băng thông Cloudflare Tunnel)
//       },
//     }),
//   )
//   uploadAvatar(@UploadedFile() file: Express.Multer.File) {
//     if (!file) {
//       throw new BadRequestException('Không tìm thấy file để upload');
//     }

//     // Trả về URL public của ảnh dựa trên domain API đã deploy của bạn
//     const fileUrl = `https://api.horse-racing.io.vn/static/avatars/${file.filename}`;

//     return {
//       message: 'Upload ảnh thành công!',
//       url: fileUrl,
//     };
//   }
// }

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Upload Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly configService: ConfigService) {}

  @Post('avatar')
  @ApiOperation({
    summary: 'Upload ảnh đại diện cho người dùng (Dung lượng < 5MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const path = './uploads/avatars';
          // Tự động tạo thư mục tầng con nếu chưa có để tránh lỗi sập Docker
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
          }
          callback(null, path);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file để upload');
    }

    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:9000';
    const fileUrl = `${appUrl}/static/avatars/${file.filename}`;
    // const fileUrl = `https://api.horse-racing.io.vn/static/avatars/${file.filename}`;

    return {
      message: 'Upload ảnh thành công!',
      url: fileUrl,
    };
  }

  @Post('tournament-banner')
  @ApiOperation({
    summary: 'Upload ảnh banner cho giải đấu (Dung lượng < 5MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const path = './uploads/tournaments'; // Lưu riêng biệt không lẫn với avatar người dùng
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
          }
          callback(null, path);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `tournament-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadTournamentBanner(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file để upload');
    }

    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:9000';
    const fileUrl = `${appUrl}/static/tournaments/${file.filename}`;

    return {
      message: 'Upload ảnh giải đấu thành công!',
      url: fileUrl,
    };
  }

  @Post('horse-avatar')
  @ApiOperation({
    summary: 'Upload ảnh avatar cho ngựa (Dung lượng < 5MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const path = './uploads/horses'; // Lưu riêng biệt không lẫn với avatar người dùng
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
          }
          callback(null, path);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `horse-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadHorseAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file để upload');
    }

    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:9000';
    const fileUrl = `${appUrl}/static/horses/${file.filename}`;

    return {
      message: 'Upload ảnh giải đấu thành công!',
      url: fileUrl,
    };
  }

  @Post('golden-hoof-avatar')
  @ApiOperation({
    summary: 'Upload ảnh cho golden-hoof (Dung lượng < 5MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const path = './uploads/golden-hoof'; // Lưu riêng biệt không lẫn với avatar người dùng
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
          }
          callback(null, path);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `golden-hoof-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadGoldenHoof(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file để upload');
    }

    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:9000';
    const fileUrl = `${appUrl}/static/golden-hoof/${file.filename}`;

    return {
      message: 'Upload ảnh giải đấu thành công!',
      url: fileUrl,
    };
  }
}
