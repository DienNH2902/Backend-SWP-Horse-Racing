import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TournamentRepository } from './tournament.repository';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { ResponseTournamentDto } from './dto/response-tournament.dto';
import { plainToInstance } from 'class-transformer';
// import { UserTournamentRepository } from './user-tournament.repository';
// import { Types } from 'mongoose';
import { GetTournamentsQueryDto } from './dto/get-tournament-status-query.dto';
import { RegistrationRepository } from '../registration/registration.repository';

// interface PopulatedUser {
//   _id: Types.ObjectId;
//   fullName?: string;
//   email?: string;
//   phoneNumber?: string;
//   avatar?: string;
//   role?: string;
// }

// interface PopulatedTournament {
//   _id: Types.ObjectId;
//   title?: string;
//   description?: string;
//   imageUrl?: string;
//   startDate?: Date;
//   endDate?: Date;
//   location?: string;
//   status?: string;
//   horsesPerRace?: number;
//   totalRaces?: number;
//   entryFee?: number;
// }
@Injectable()
export class TournamentService {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly registrationRepository: RegistrationRepository,
    // private readonly userTournamentRepository: UserTournamentRepository,
  ) {}

  private toResponse(data: any): any {
    if (!data) return data;
    return plainToInstance(ResponseTournamentDto, data, {
      excludeExtraneousValues: true,
    });
  }

  private async calculateAvailableSlot(
    tournamentId: string,
    horsesPerRace: number,
    totalRaces: number,
  ): Promise<number> {
    // Gọi hàm đếm số lượng đơn đăng ký đang chiếm slot từ RegistrationRepository
    const registeredCount =
      await this.registrationRepository.countActiveRegistrationsByTournament(
        tournamentId,
      );

    // Tính tổng sức chứa hệ thống
    const maxCapacity = (horsesPerRace || 0) * (totalRaces || 0);

    // Trả về số lượng slot còn trống
    const availableSlot = maxCapacity - registeredCount;
    return availableSlot > 0 ? availableSlot : 0;
  }

  async createTournament(
    dto: CreateTournamentDto,
  ): Promise<ResponseTournamentDto> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    //Không cần validate ở đây vì đã validate ở createDto
    // if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    //   throw new BadRequestException('Định dạng ngày tháng không hợp lệ');
    // }

    if (start >= end) {
      throw new BadRequestException(
        'Ngày bắt đầu giải đấu phải trước ngày kết thúc',
      );
    }

    const tournament = await this.tournamentRepository.createTournament({
      ...dto,
      startDate: start,
      endDate: end,
    });

    return this.toResponse(tournament);
  }

  // async getAllTournament(): Promise<ResponseTournamentDto[]> {
  //   const tournaments = await this.tournamentRepository.findAllTournament();
  //   return this.toResponse(tournaments);
  // }

  // async getAllTournament(
  //   query: GetTournamentsQueryDto,
  // ): Promise<ResponseTournamentDto[]> {
  //   const tournaments = await this.tournamentRepository.findAllTournament({
  //     status: query.status,
  //   });
  //   return this.toResponse(tournaments);
  // }

  async getAllTournament(query: GetTournamentsQueryDto): Promise<any[]> {
    const tournaments = await this.tournamentRepository.findAllTournament({
      status: query.status,
    });

    // Duyệt qua từng giải đấu để tính toán động availableSlot
    const result = await Promise.all(
      tournaments.map(async (tournament) => {
        const plainTournament = tournament.toObject();
        const availableSlot = await this.calculateAvailableSlot(
          plainTournament._id.toString(),
          plainTournament.horsesPerRace,
          plainTournament.totalRaces,
        );

        return {
          ...this.toResponse(plainTournament),
          availableSlot,
        };
      }),
    );

    return result;
  }

  // async getOneTournament(id: string): Promise<ResponseTournamentDto> {
  //   const tournament = await this.tournamentRepository.findTournamentById(id);
  //   if (!tournament) {
  //     throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
  //   }
  //   return this.toResponse(tournament);
  // }

  async getOneTournament(id: string): Promise<any> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
    }

    const plainTournament = tournament.toObject();
    const availableSlot = await this.calculateAvailableSlot(
      plainTournament._id.toString(),
      plainTournament.horsesPerRace,
      plainTournament.totalRaces,
    );

    return {
      ...this.toResponse(plainTournament),
      availableSlot,
    };
  }

  // async joinTournament(userId: string, tournamentId: string): Promise<any> {
  //   const join = await this.userTournamentRepository.joinTournament(
  //     userId,
  //     tournamentId,
  //   );
  //   return {
  //     _id: join._id.toString(),
  //     userId: join.userId.toString(),
  //     tournamentId: join.tournamentId.toString(),
  //   };
  // }

  // async joinTournament(userId: string, tournamentId: string): Promise<any> {
  //   // Thêm kiểm tra validation trước khi cho phép người dùng đăng ký tham gia
  //   const tournament =
  //     await this.tournamentRepository.findTournamentById(tournamentId);
  //   if (!tournament) {
  //     throw new NotFoundException('Giải đấu không tồn tại');
  //   }

  //   const slotLeft = await this.calculateAvailableSlot(
  //     tournamentId,
  //     tournament.horsesPerRace,
  //     tournament.totalRaces,
  //   );

  //   if (slotLeft <= 0) {
  //     throw new BadRequestException(
  //       'Giải đấu đã đầy slot, không thể đăng ký thêm',
  //     );
  //   }

  //   const join = await this.userTournamentRepository.joinTournament(
  //     userId,
  //     tournamentId,
  //   );
  //   return {
  //     _id: join._id.toString(),
  //     userId: join.userId.toString(),
  //     tournamentId: join.tournamentId.toString(),
  //   };
  // }

  // async findTournamentsByUser(userId: string) {
  //   const tournaments =
  //     await this.userTournamentRepository.findTournamentsByUser(userId);

  //   const formatDate = (value: any): string | null => {
  //     const date = new Date(value);
  //     if (value && !isNaN(date.getTime())) {
  //       const day = String(date.getDate()).padStart(2, '0');
  //       const month = String(date.getMonth() + 1).padStart(2, '0');
  //       const year = date.getFullYear();
  //       return `${day}/${month}/${year}`;
  //     }
  //     return null;
  //   };

  //   // Trả về một mảng đã phẳng hóa dữ liệu trực tiếp, không đi qua hàm toResponse nữa
  //   return Promise.all(
  //     tournaments.map(async (item) => {
  //       const tournamentRaw = item.tournamentId as PopulatedTournament;
  //       const tId =
  //         tournamentRaw?._id?.toString() || item.tournamentId?.toString();

  //       let availableSlot = 0;
  //       if (tournamentRaw) {
  //         availableSlot = await this.calculateAvailableSlot(
  //           tId,
  //           tournamentRaw.horsesPerRace || 0,
  //           tournamentRaw.totalRaces || 0,
  //         );
  //       }

  //       return {
  //         registrationId: item._id.toString(),
  //         userId: item.userId?.toString(),
  //         tournamentId: tId,
  //         title: tournamentRaw?.title || null,
  //         description: tournamentRaw?.description || null,
  //         imageUrl:
  //           tournamentRaw?.imageUrl ||
  //           'https://thumb.photo-ac.com/a9/a9c7ce839f672dabd9752457822046e5_t.jpeg',
  //         startDate: formatDate(tournamentRaw?.startDate),
  //         endDate: formatDate(tournamentRaw?.endDate),
  //         location: tournamentRaw?.location || null,
  //         status: tournamentRaw?.status || null,
  //         horsesPerRace: tournamentRaw?.horsesPerRace || null,
  //         totalRaces: tournamentRaw?.totalRaces || null,
  //         entryFee: tournamentRaw?.entryFee || null,
  //         availableSlot, // Trả thêm dữ liệu slot trống ra cấu trúc phẳng
  //       };
  //     }),
  //   );
  // }

  // async findUsersByTournament(tournamentId: string) {
  //   const listParticipants =
  //     await this.userTournamentRepository.findUsersByTournament(tournamentId);

  //   // Sử dụng map để duyệt qua mảng và bóc tách dữ liệu của từng người tham gia
  //   const formattedParticipants = listParticipants.map((item) => {
  //     const userRaw = item.userId as PopulatedUser;

  //     return {
  //       // ID của bản ghi đăng ký trung gian nếu Frontend cần dùng để hủy tham gia
  //       registrationId: item._id.toString(),

  //       // Phẳng hóa thông tin người dùng
  //       userId: userRaw?._id?.toString() || item.userId?.toString(),
  //       fullName: userRaw?.fullName || null,
  //       email: userRaw?.email || null,
  //       phoneNumber: userRaw?.phoneNumber || null,
  //       avatar: userRaw?.avatar || null,
  //       role: userRaw?.role || null,
  //     };
  //   });

  //   return {
  //     tournamentId,
  //     totalParticipants: formattedParticipants.length, // Trả thêm tổng số lượng người tham gia
  //     participants: formattedParticipants,
  //   };
  // }

  async updateTournament(
    id: string,
    dto: UpdateTournamentDto,
  ): Promise<ResponseTournamentDto> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu để cập nhật');
    }

    const updateData: any = { ...dto };

    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    if (
      updateData.startDate &&
      updateData.endDate &&
      updateData.startDate >= updateData.endDate
    ) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    const updated = await this.tournamentRepository.updateTournament(
      id,
      updateData,
    );
    return this.toResponse(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateTournamentStatusDto,
  ): Promise<ResponseTournamentDto> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
    }

    const updated = await this.tournamentRepository.updateTournament(id, {
      status: dto.status,
    });
    return this.toResponse(updated);
  }

  async removeTournament(id: string): Promise<{ message: string }> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu để xóa');
    }
    await this.tournamentRepository.deleteTournament(id);
    return { message: 'Xóa giải đấu thành công' };
  }
}
