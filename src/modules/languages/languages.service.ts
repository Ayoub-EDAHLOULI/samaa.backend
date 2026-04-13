import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { CreateLanguageDto, UpdateLanguageDto } from "./languages.types";

export const languageService = {
  /**
   * Get all languages
   */
  async getAllLanguages(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};

    return prisma.language.findMany({
      where,
      orderBy: [
        { isDefault: "desc" }, // Default language first
        { code: "asc" },
      ],
    });
  },

  /**
   * Get language by code
   */
  async getLanguageByCode(code: string) {
    const language = await prisma.language.findUnique({
      where: { code },
    });

    if (!language) {
      throw new AppError("Language not found", StatusCodes.NOT_FOUND);
    }

    return language;
  },

  /**
   * Create a new language
   */
  async createLanguage(data: CreateLanguageDto) {
    // Check if language code already exists
    const existing = await prisma.language.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new AppError(
        "Language with this code already exists",
        StatusCodes.CONFLICT,
      );
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.language.create({
      data: {
        code: data.code,
        name: data.name,
        isDefault: data.isDefault || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  },

  /**
   * Update a language
   */
  async updateLanguage(code: string, data: UpdateLanguageDto) {
    // Check if language exists
    const language = await prisma.language.findUnique({
      where: { code },
    });

    if (!language) {
      throw new AppError("Language not found", StatusCodes.NOT_FOUND);
    }

    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await prisma.language.updateMany({
        where: { isDefault: true, code: { not: code } },
        data: { isDefault: false },
      });
    }

    return prisma.language.update({
      where: { code },
      data,
    });
  },

  /**
   * Delete a language
   */
  async deleteLanguage(code: string) {
    // Check if language exists
    const language = await prisma.language.findUnique({
      where: { code },
    });

    if (!language) {
      throw new AppError("Language not found", StatusCodes.NOT_FOUND);
    }

    // Prevent deleting default language
    if (language.isDefault) {
      throw new AppError(
        "Cannot delete the default language",
        StatusCodes.BAD_REQUEST,
      );
    }

    await prisma.language.delete({
      where: { code },
    });
  },

  /**
   * Get default language
   */
  async getDefaultLanguage() {
    const defaultLang = await prisma.language.findFirst({
      where: { isDefault: true },
    });

    if (!defaultLang) {
      throw new AppError(
        "No default language configured",
        StatusCodes.NOT_FOUND,
      );
    }

    return defaultLang;
  },
};
