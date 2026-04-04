import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { SurahResponse, UpdateSurahDto } from "./surahs.types";

const surahSelect = {
  id: true,
  arabicName: true,
  englishName: true,
  ayahCount: true,
} as const;

export const surahService = {
  // ---------------------------------------------------------------------------
  // List all 114 surahs ordered by their Quran number (Public)
  // ---------------------------------------------------------------------------
  async getAllSurahs(): Promise<SurahResponse[]> {
    return prisma.surah.findMany({
      select: surahSelect,
      orderBy: { id: "asc" },
    });
  },

  // ---------------------------------------------------------------------------
  // Get a single surah by its Quran number 1–114 (Public)
  // ---------------------------------------------------------------------------
  async getSurahById(id: number): Promise<SurahResponse> {
    const surah = await prisma.surah.findUnique({
      where: { id },
      select: surahSelect,
    });

    if (!surah) {
      throw new AppError(`Surah #${id} not found`, StatusCodes.NOT_FOUND);
    }

    return surah;
  },

  // ---------------------------------------------------------------------------
  // Update a surah — for admin corrections only (no create / delete)
  // ---------------------------------------------------------------------------
  async updateSurah(id: number, data: UpdateSurahDto): Promise<SurahResponse> {
    const surah = await prisma.surah.findUnique({ where: { id } });

    if (!surah) {
      throw new AppError(`Surah #${id} not found`, StatusCodes.NOT_FOUND);
    }

    return prisma.surah.update({
      where: { id },
      data: {
        ...(data.arabicName !== undefined && { arabicName: data.arabicName }),
        ...(data.englishName !== undefined && {
          englishName: data.englishName,
        }),
        ...(data.ayahCount !== undefined && { ayahCount: data.ayahCount }),
      },
      select: surahSelect,
    });
  },
};
