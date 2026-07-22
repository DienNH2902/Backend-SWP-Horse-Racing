import { Exclude, Expose, Transform } from 'class-transformer';
import { ResponseJockeyLicenseDto } from 'src/modules/jockey-license/dto/response-jockey-license.dto';
import { JockeyLicenseService } from 'src/modules/jockey-license/jockey-license.service';

export class ResponseUserDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  @Transform(({ obj }) => {
    // Ép kiểu chữ để tránh lỗi sai sót về hoa/thường trong DB (Jockey vs jockey)
    const formattedRole = obj.role?.toLowerCase() as string;

    if (formattedRole === 'jockey') {
      return (
        obj.jockeyProfile?._id?.toString() || obj.jockeyProfile?.id?.toString()
      );
    }
    if (formattedRole === 'referee') {
      return (
        obj.refereeProfile?._id?.toString() ||
        obj.refereeProfile?.id?.toString()
      );
    }
    if (formattedRole === 'horse owner' || formattedRole === 'horseowner') {
      return (
        obj.horseOwnerProfile?._id?.toString() ||
        obj.horseOwnerProfile?.id?.toString()
      );
    }
    if (formattedRole === 'spectator') {
      return (
        obj.spectatorProfile?._id?.toString() ||
        obj.spectatorProfile?.id?.toString()
      );
    }
    return undefined;
  })
  profileId: string;

  @Expose() fullName: string;
  @Expose() email: string;
  @Expose() phoneNumber: string;
  @Expose() address: string;
  @Expose() avatar: string;

  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = value.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return value;
  })
  dateOfBirth: string;

  @Expose() gender: number;
  @Expose() role: string;
  @Expose() status: string;
  @Expose() activeBackground: string;
  // @Expose() refreshToken: string;

  // ==========================================
  // 1. CÁC FIELDS CHUYÊN BIỆT CHO JOCKEY
  // ==========================================

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Jockey'
      ? (obj.jockeyProfile?.weight ?? obj.weight)
      : undefined,
  )
  weight?: number;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Jockey'
      ? (obj.jockeyProfile?.height ?? obj.height)
      : undefined,
  )
  height?: number;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Jockey'
      ? (obj.jockeyProfile?.jockeyStatus ?? obj.jockeyStatus)
      : undefined,
  )
  jockeyStatus?: string;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.role !== 'Jockey') return undefined;

    // Gọi trực tiếp hàm xử lý tập trung đã được chuyển về Service bảo trì
    return JockeyLicenseService.transformLicenses(
      obj.jockeyProfile?.licenses || obj.licenses,
    );
  })
  licenses?: ResponseJockeyLicenseDto[];

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Jockey'
      ? (obj.jockeyProfile?.totalWin ?? obj.totalWin)
      : undefined,
  )
  totalWin?: number;

  // ==========================================
  // 2. CÁC FIELDS CHUYÊN BIỆT CHO REFEREE
  // ==========================================

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Referee'
      ? (obj.refereeProfile?.experienceYears ?? obj.experienceYears ?? 0)
      : undefined,
  )
  experienceYears?: number;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Referee'
      ? (obj.refereeProfile?.certification ??
        obj.certification ??
        'No certification yet')
      : undefined,
  )
  certification?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Referee'
      ? (obj.refereeProfile?.racesAttempt ?? obj.racesAttempt ?? 0)
      : undefined,
  )
  racesAttempt?: number;

  // ==========================================
  // 3. CÁC FIELDS CHUYÊN BIỆT CHO HORSE OWNER
  // ==========================================

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Horse Owner'
      ? (obj.horseOwnerProfile?.stableName ?? obj.stableName)
      : undefined,
  )
  stableName?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Horse Owner'
      ? (obj.horseOwnerProfile?.stableAddress ?? obj.stableAddress)
      : undefined,
  )
  stableAddress?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Horse Owner'
      ? (obj.horseOwnerProfile?.totalHorsesOwned ?? obj.totalHorsesOwned ?? 0)
      : undefined,
  )
  totalHorsesOwned?: number;

  // @Expose()
  // @Transform(({ obj }) => {
  //   if (obj.role !== 'Horse Owner') return undefined;

  //   // Đảm bảo lấy được giá trị kể cả khi dữ liệu chưa qua hoặc đã qua hàm biến đổi plain Object
  //   const profile = obj.horseOwnerProfile;
  //   if (!profile) return 0;

  //   return profile.totalHorsesOwned ?? 0;
  // })
  // totalHorsesOwned?: number;

  // ==========================================
  // 4. CÁC FIELDS CHUYÊN BIỆT CHO SPECTATOR
  // ==========================================

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Spectator'
      ? (obj.spectatorProfile?.pointBalance ?? obj.pointBalance ?? 0)
      : undefined,
  )
  pointBalance?: number;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Spectator'
      ? (obj.spectatorProfile?.totalPoints ?? obj.totalPoints ?? 0)
      : undefined,
  )
  totalPoints?: number;

  @Expose()
  @Transform(({ obj }) =>
    obj.role === 'Spectator'
      ? (obj.spectatorProfile?.totalBets ?? obj.totalBets ?? 0)
      : undefined,
  )
  totalBets?: number;

  // ==========================================
  // 5. CÁC FIELDS DÙNG CHUNG NHƯNG PHÂN TÁCH LOGIC TỪNG ROLE
  // ==========================================

  // @Expose()
  // @Transform(({ obj }) => {
  //   if (obj.role === 'Jockey')
  //     return obj.jockeyProfile?.winRate ?? obj.winRate ?? 0;
  //   if (obj.role === 'Spectator')
  //     return obj.spectatorProfile?.winRate ?? obj.winRate ?? 0;
  //   return undefined;
  // })
  // winRate?: number;

  @Expose()
  @Transform(({ obj }) => {
    let rawWinRate: number | undefined;

    if (obj.role === 'Jockey') {
      rawWinRate = obj.jockeyProfile?.winRate ?? obj.winRate;
    } else if (obj.role === 'Spectator') {
      rawWinRate = obj.spectatorProfile?.winRate ?? obj.winRate;
    } else {
      return undefined;
    }

    if (rawWinRate === undefined || rawWinRate === null || isNaN(rawWinRate)) {
      return 0;
    }

    // Làm tròn lấy 2 chữ số thập phân (ví dụ: 0.222222... -> 0.22)
    return Number(Number(rawWinRate).toFixed(2));
  })
  winRate?: number;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.role === 'Jockey')
      return obj.jockeyProfile?.balance ?? obj.balance ?? 0;
    if (obj.role === 'Horse Owner')
      return obj.horseOwnerProfile?.balance ?? obj.balance ?? 0;
    return undefined;
  })
  balance?: number;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.role === 'Jockey')
      return obj.jockeyProfile?.heldBalance ?? obj.heldBalance ?? 0;
    if (obj.role === 'Horse Owner')
      return obj.horseOwnerProfile?.heldBalance ?? obj.heldBalance ?? 0;
    return undefined;
  })
  heldBalance?: number;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.role === 'Jockey')
      return obj.jockeyProfile?.reputationPoints ?? obj.reputationPoints ?? 0;
    if (obj.role === 'Horse Owner')
      return (
        obj.horseOwnerProfile?.reputationPoints ?? obj.reputationPoints ?? 0
      );
    if (obj.role === 'Referee')
      return obj.refereeProfile?.reputationPoints ?? obj.reputationPoints ?? 0;
    return undefined;
  })
  reputationPoints?: number;

  // ==========================================
  // 6. LỊCH SỬ ĐUA (HISTORY RACE) — JOCKEY & HORSE OWNER
  // Map thủ công trong @Transform (không dùng @Type) để tránh lộ
  // toàn bộ field raw từ MongoDB document (_id, status, finishedTime, __v...)
  // ==========================================

  @Expose()
  @Transform(({ obj }) => {
    if (obj.role !== 'Jockey') return undefined;
    return (obj.historyRace || []).map((r: any) => ({
      raceId: r.raceId?._id?.toString(),
      raceName: r.raceId?.name,
      tournamentId: r.raceId?.tournamentId?._id?.toString(),
      tournamentName: r.raceId?.tournamentId?.title,
      date: r.raceId?.date,
      finalRank: r.finalRank,
      jockeyProfileId: r.jockeyId?._id?.toString(),
      jockeyName: r.jockeyId?.userId?.fullName,
      horseId: r.horseId?._id?.toString(),
      horseName: r.horseId?.name,
      horseOwnerId: r.horseId?.userId?._id?.toString(),
      horseOwnerName: r.horseId?.userId?.fullName,
      prizeName: r.prize?.name ?? null,
      prizeAmount: r.prize?.amount ?? 0,
    }));
  })
  historyRaceJockey?: Record<string, any>[];

  @Expose()
  @Transform(({ obj }) => {
    if (obj.role !== 'Horse Owner') return undefined;
    return (obj.historyRace || []).map((r: any) => ({
      raceId: r.raceId?._id?.toString(),
      raceName: r.raceId?.name,
      tournamentId: r.raceId?.tournamentId?._id?.toString(),
      tournamentName: r.raceId?.tournamentId?.title,
      date: r.raceId?.date,
      finalRank: r.finalRank,
      jockeyProfileId: r.jockeyId?._id?.toString(),
      jockeyName: r.jockeyId?.userId?.fullName,
      horseId: r.horseId?._id?.toString(),
      horseName: r.horseId?.name,
      prizeName: r.prize?.name ?? null,
      prizeAmount: r.prize?.amount ?? 0,
    }));
  })
  historyRaceOwner?: Record<string, any>[];

  @Exclude()
  password: string;

  @Exclude()
  __v: number;
}

// // import { Exclude, Expose, Transform } from 'class-transformer';

// // export class ResponseUserDto {
// //   @Expose()
// //   @Transform(({ obj }) => obj._id?.toString())
// //   _id: string;

// //   @Expose() fullName: string;
// //   @Expose() email: string;
// //   @Expose() phoneNumber: string;
// //   @Expose() address: string;
// //   @Expose() avatar: string;
// //   @Expose()
// //   @Transform(({ value }) => {
// //     // Kiểm tra nếu giá trị là một Object Date hợp lệ
// //     if (value instanceof Date && !isNaN(value.getTime())) {
// //       const day = String(value.getDate()).padStart(2, '0');
// //       const month = String(value.getMonth() + 1).padStart(2, '0'); // Tháng trong JS chạy từ 0-11
// //       const year = value.getFullYear();

// //       return `${day}/${month}/${year}`;
// //     }
// //     return value;
// //   })
// //   dateOfBirth: Date;

// //   @Expose() gender: number;
// //   @Expose() role: string;
// //   @Expose() status: string;

// //   @Expose() licenseNumber?: string;
// //   @Expose() weight?: number;
// //   @Expose() stableName?: string;
// //   @Expose() balance?: number;

// //   @Exclude()
// //   password: string;

// //   @Exclude()
// //   __v: number;
// // }

// import { Exclude, Expose, Transform } from 'class-transformer';
// export class ResponseUserDto {
//   @Expose()
//   @Transform(({ obj }) => obj._id?.toString())
//   _id: string;

//   @Expose() fullName: string;
//   @Expose() email: string;
//   @Expose() phoneNumber: string;
//   @Expose() address: string;
//   @Expose() avatar: string;

//   @Expose()
//   @Transform(({ value }) => {
//     if (value instanceof Date && !isNaN(value.getTime())) {
//       const day = String(value.getDate()).padStart(2, '0');
//       const month = String(value.getMonth() + 1).padStart(2, '0');
//       const year = value.getFullYear();
//       return `${day}/${month}/${year}`;
//     }
//     return value;
//   })
//   dateOfBirth: string; // Đổi kiểu dữ liệu thành string sau khi đã transform thành DD/MM/YYYY

//   @Expose() gender: number;
//   @Expose() role: string;
//   @Expose() status: string;

//   // --- MAP DỮ LIỆU ĐỘNG TỪ CÁC BẢNG PROFILE POPULATE LÊN ---

//   @Expose()
//   @Transform(({ obj }) => obj.jockeyProfile?.weight || obj.weight)
//   weight?: number;

//   @Expose()
//   @Transform(({ obj }) => obj.jockeyProfile?.height || obj.height)
//   height?: number;

//   @Expose()
//   @Transform(({ obj }) => obj.jockeyProfile?.jockeyStatus || obj.jockeyStatus)
//   jockeyStatus?: string;

//   // @Expose()
//   // @Transform(
//   //   ({ obj }) => obj.jockeyProfile?.winRate || obj.jockeyProfileWinRate,
//   // )
//   // winRate?: number;

//   @Expose()
//   @Transform(
//     ({ obj }) =>
//       obj.refereeProfile?.experienceYears ?? obj.experienceYears ?? 0,
//   )
//   experienceYears?: number;

//   @Expose()
//   @Transform(
//     ({ obj }) =>
//       obj.refereeProfile?.certification ??
//       obj.certification ??
//       'No certification yet',
//   )
//   certification?: string;

//   @Expose()
//   @Transform(
//     ({ obj }) => obj.refereeProfile?.racesAttempt ?? obj.racesAttempt ?? 0,
//   )
//   racesAttempt?: number;

//   @Expose()
//   @Transform(({ obj }) => obj.horseOwnerProfile?.stableName ?? obj.stableName)
//   stableName?: string;

//   @Expose()
//   @Transform(
//     ({ obj }) => obj.horseOwnerProfile?.stableAddress ?? obj.stableAddress,
//   )
//   stableAddress?: string;

//   @Expose()
//   @Transform(
//     ({ obj }) =>
//       obj.horseOwnerProfile?.totalHorsesOwned ?? obj.totalHorsesOwned,
//   )
//   totalHorsesOwned?: number;

//   @Expose()
//   @Transform(
//     ({ obj }) => obj.spectatorProfile?.pointBalance ?? obj.pointBalance,
//   )
//   pointBalance?: number;

//   @Expose()
//   @Transform(({ obj }) => obj.spectatorProfile?.totalPoints ?? obj.totalPoints)
//   totalPoints?: number;

//   @Expose()
//   @Transform(({ obj }) => obj.spectatorProfile?.totalBets ?? obj.totalBets)
//   totalBets?: number;

//   // @Expose()
//   // @Transform(({ obj }) => obj.spectatorProfile?.winRate ?? obj.winRate)
//   // winRate?: number;

//   // @Expose()
//   // @Transform(({ obj }) => {
//   //   // Trả ra balance tương ứng của Jockey hoặc HorseOwner tùy theo role hiện tại
//   //   if (obj.role === 'Jockey') return obj.jockeyProfile?.balance;
//   //   if (obj.role === 'Horse Owner') return obj.horseOwnerProfile?.balance;
//   //   return undefined;
//   // })
//   // balance?: number;

//   // @Expose()
//   // @Transform(({ obj }) => {
//   //   // Trả ra điểm uy tín tương ứng của từng bên
//   //   if (obj.role === 'Jockey') return obj.jockeyProfile?.reputationPoints;
//   //   if (obj.role === 'Horse Owner')
//   //     return obj.horseOwnerProfile?.reputationPoints;
//   //   if (obj.role === 'Referee') return obj.refereeProfile?.reputationPoints;
//   //   return undefined;
//   // })
//   // reputationPoints?: number;
//   @Expose()
//   @Transform(({ obj }) => {
//     // Nếu có bảng phụ jockeyProfile/horseOwnerProfile thì lấy balance trong đó,
//     // nếu không có (hoặc bảng phụ không có trường đó) thì lấy trường balance ở ngay bảng gốc
//     if (obj.role === 'Jockey')
//       return obj.jockeyProfile?.winRate ?? obj.winRate ?? 0;
//     if (obj.role === 'Spectator')
//       return obj.spectatorProfile?.winRate ?? obj.winRate ?? 0;
//     return undefined;
//   })
//   winRate?: number;

//   @Expose()
//   @Transform(({ obj }) => {
//     // Nếu có bảng phụ jockeyProfile/horseOwnerProfile thì lấy balance trong đó,
//     // nếu không có (hoặc bảng phụ không có trường đó) thì lấy trường balance ở ngay bảng gốc
//     if (obj.role === 'Jockey')
//       return obj.jockeyProfile?.balance ?? obj.balance ?? 0;
//     if (obj.role === 'Horse Owner')
//       return obj.horseOwnerProfile?.balance ?? obj.balance ?? 0;
//     return undefined;
//   })
//   balance?: number;

//   @Expose()
//   @Transform(({ obj }) => {
//     // Áp dụng tương tự cho điểm uy tín, ưu tiên bảng phụ rồi đến bảng gốc, mặc định trả về 0 nếu không tìm thấy
//     if (obj.role === 'Jockey')
//       return obj.jockeyProfile?.reputationPoints ?? obj.reputationPoints ?? 0;
//     if (obj.role === 'Horse Owner')
//       return (
//         obj.horseOwnerProfile?.reputationPoints ?? obj.reputationPoints ?? 0
//       );
//     if (obj.role === 'Referee')
//       return obj.refereeProfile?.reputationPoints ?? obj.reputationPoints ?? 0;
//     return undefined;
//   })
//   reputationPoints?: number;

//   @Exclude()
//   password: string;

//   @Exclude()
//   __v: number;
// }

// import { Exclude, Expose, Transform } from 'class-transformer';
// import { ResponseJockeyLicenseDto } from 'src/modules/jockey-license/dto/response-jockey-license.dto';
// import { JockeyLicenseService } from 'src/modules/jockey-license/jockey-license.service';

// export class ResponseUserDto {
//   @Expose()
//   @Transform(({ obj }) => obj._id?.toString())
//   _id: string;

//   @Expose()
//   @Transform(({ obj }) => {
//     // Ép kiểu chữ để tránh lỗi sai sót về hoa/thường trong DB (Jockey vs jockey)
//     const formattedRole = obj.role?.toLowerCase() as string;

//     if (formattedRole === 'jockey') {
//       return (
//         obj.jockeyProfile?._id?.toString() || obj.jockeyProfile?.id?.toString()
//       );
//     }
//     if (formattedRole === 'referee') {
//       return (
//         obj.refereeProfile?._id?.toString() ||
//         obj.refereeProfile?.id?.toString()
//       );
//     }
//     if (formattedRole === 'horse owner' || formattedRole === 'horseowner') {
//       return (
//         obj.horseOwnerProfile?._id?.toString() ||
//         obj.horseOwnerProfile?.id?.toString()
//       );
//     }
//     if (formattedRole === 'spectator') {
//       return (
//         obj.spectatorProfile?._id?.toString() ||
//         obj.spectatorProfile?.id?.toString()
//       );
//     }
//     return undefined;
//   })
//   profileId: string;

//   @Expose() fullName: string;
//   @Expose() email: string;
//   @Expose() phoneNumber: string;
//   @Expose() address: string;
//   @Expose() avatar: string;

//   @Expose()
//   @Transform(({ value }) => {
//     if (value instanceof Date && !isNaN(value.getTime())) {
//       const day = String(value.getDate()).padStart(2, '0');
//       const month = String(value.getMonth() + 1).padStart(2, '0');
//       const year = value.getFullYear();
//       return `${day}/${month}/${year}`;
//     }
//     return value;
//   })
//   dateOfBirth: string;

//   @Expose() gender: number;
//   @Expose() role: string;
//   @Expose() status: string;
//   @Expose() activeBackground: string;
//   // @Expose() refreshToken: string;

//   // ==========================================
//   // 1. CÁC FIELDS CHUYÊN BIỆT CHO JOCKEY
//   // ==========================================

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Jockey'
//       ? (obj.jockeyProfile?.weight ?? obj.weight)
//       : undefined,
//   )
//   weight?: number;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Jockey'
//       ? (obj.jockeyProfile?.height ?? obj.height)
//       : undefined,
//   )
//   height?: number;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Jockey'
//       ? (obj.jockeyProfile?.jockeyStatus ?? obj.jockeyStatus)
//       : undefined,
//   )
//   jockeyStatus?: string;

//   @Expose()
//   @Transform(({ obj }) => {
//     if (obj.role !== 'Jockey') return undefined;

//     // Gọi trực tiếp hàm xử lý tập trung đã được chuyển về Service bảo trì
//     return JockeyLicenseService.transformLicenses(
//       obj.jockeyProfile?.licenses || obj.licenses,
//     );
//   })
//   licenses?: ResponseJockeyLicenseDto[];

//   // ==========================================
//   // 2. CÁC FIELDS CHUYÊN BIỆT CHO REFEREE
//   // ==========================================

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Referee'
//       ? (obj.refereeProfile?.experienceYears ?? obj.experienceYears ?? 0)
//       : undefined,
//   )
//   experienceYears?: number;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Referee'
//       ? (obj.refereeProfile?.certification ??
//         obj.certification ??
//         'No certification yet')
//       : undefined,
//   )
//   certification?: string;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Referee'
//       ? (obj.refereeProfile?.racesAttempt ?? obj.racesAttempt ?? 0)
//       : undefined,
//   )
//   racesAttempt?: number;

//   // ==========================================
//   // 3. CÁC FIELDS CHUYÊN BIỆT CHO HORSE OWNER
//   // ==========================================

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Horse Owner'
//       ? (obj.horseOwnerProfile?.stableName ?? obj.stableName)
//       : undefined,
//   )
//   stableName?: string;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Horse Owner'
//       ? (obj.horseOwnerProfile?.stableAddress ?? obj.stableAddress)
//       : undefined,
//   )
//   stableAddress?: string;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Horse Owner'
//       ? (obj.horseOwnerProfile?.totalHorsesOwned ?? obj.totalHorsesOwned ?? 0)
//       : undefined,
//   )
//   totalHorsesOwned?: number;

//   // @Expose()
//   // @Transform(({ obj }) => {
//   //   if (obj.role !== 'Horse Owner') return undefined;

//   //   // Đảm bảo lấy được giá trị kể cả khi dữ liệu chưa qua hoặc đã qua hàm biến đổi plain Object
//   //   const profile = obj.horseOwnerProfile;
//   //   if (!profile) return 0;

//   //   return profile.totalHorsesOwned ?? 0;
//   // })
//   // totalHorsesOwned?: number;

//   // ==========================================
//   // 4. CÁC FIELDS CHUYÊN BIỆT CHO SPECTATOR
//   // ==========================================

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Spectator'
//       ? (obj.spectatorProfile?.pointBalance ?? obj.pointBalance ?? 0)
//       : undefined,
//   )
//   pointBalance?: number;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Spectator'
//       ? (obj.spectatorProfile?.totalPoints ?? obj.totalPoints ?? 0)
//       : undefined,
//   )
//   totalPoints?: number;

//   @Expose()
//   @Transform(({ obj }) =>
//     obj.role === 'Spectator'
//       ? (obj.spectatorProfile?.totalBets ?? obj.totalBets ?? 0)
//       : undefined,
//   )
//   totalBets?: number;

//   // ==========================================
//   // 5. CÁC FIELDS DÙNG CHUNG NHƯNG PHÂN TÁCH LOGIC TỪNG ROLE
//   // ==========================================

//   @Expose()
//   @Transform(({ obj }) => {
//     if (obj.role === 'Jockey')
//       return obj.jockeyProfile?.winRate ?? obj.winRate ?? 0;
//     if (obj.role === 'Spectator')
//       return obj.spectatorProfile?.winRate ?? obj.winRate ?? 0;
//     return undefined;
//   })
//   winRate?: number;

//   @Expose()
//   @Transform(({ obj }) => {
//     if (obj.role === 'Jockey')
//       return obj.jockeyProfile?.balance ?? obj.balance ?? 0;
//     if (obj.role === 'Horse Owner')
//       return obj.horseOwnerProfile?.balance ?? obj.balance ?? 0;
//     return undefined;
//   })
//   balance?: number;

//   @Expose()
//   @Transform(({ obj }) => {
//     if (obj.role === 'Jockey')
//       return obj.jockeyProfile?.heldBalance ?? obj.heldBalance ?? 0;
//     if (obj.role === 'Horse Owner')
//       return obj.horseOwnerProfile?.heldBalance ?? obj.heldBalance ?? 0;
//     return undefined;
//   })
//   heldBalance?: number;

//   @Expose()
//   @Transform(({ obj }) => {
//     if (obj.role === 'Jockey')
//       return obj.jockeyProfile?.reputationPoints ?? obj.reputationPoints ?? 0;
//     if (obj.role === 'Horse Owner')
//       return (
//         obj.horseOwnerProfile?.reputationPoints ?? obj.reputationPoints ?? 0
//       );
//     if (obj.role === 'Referee')
//       return obj.refereeProfile?.reputationPoints ?? obj.reputationPoints ?? 0;
//     return undefined;
//   })
//   reputationPoints?: number;

//   // ==========================================
//   // 6. LỊCH SỬ ĐUA (HISTORY RACE) — JOCKEY & HORSE OWNER
//   // Map thủ công trong @Transform (không dùng @Type) để tránh lộ
//   // toàn bộ field raw từ MongoDB document (_id, status, finishedTime, __v...)
//   // ==========================================

//   @Expose()
//   @Transform(({ obj }) => {
//     if (obj.role !== 'Jockey') return undefined;
//     return (obj.historyRace || []).map((r: any) => ({
//       raceId: r.raceId?._id?.toString(),
//       raceName: r.raceId?.name,
//       tournamentId: r.raceId?.tournamentId?._id?.toString(),
//       tournamentName: r.raceId?.tournamentId?.title,
//       date: r.raceId?.date,
//       finalRank: r.finalRank,
//       jockeyProfileId: r.jockeyId?._id?.toString(),
//       jockeyName: r.jockeyId?.userId?.fullName,
//       horseOwnerId: r.horseId?.userId?._id?.toString(),
//       horseOwnerName: r.horseId?.userId?.fullName,
//     }));
//   })
//   historyRaceJockey?: Record<string, any>[];

//   @Expose()
//   @Transform(({ obj }) => {
//     if (obj.role !== 'Horse Owner') return undefined;
//     return (obj.historyRace || []).map((r: any) => ({
//       raceId: r.raceId?._id?.toString(),
//       raceName: r.raceId?.name,
//       tournamentId: r.raceId?.tournamentId?._id?.toString(),
//       tournamentName: r.raceId?.tournamentId?.title,
//       date: r.raceId?.date,
//       finalRank: r.finalRank,
//       jockeyProfileId: r.jockeyId?._id?.toString(),
//       jockeyName: r.jockeyId?.userId?.fullName,
//       horseId: r.horseId?._id?.toString(),
//       horseName: r.horseId?.name,
//     }));
//   })
//   historyRaceOwner?: Record<string, any>[];

//   @Exclude()
//   password: string;

//   @Exclude()
//   __v: number;
// }
