import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
  UpdateBlogCategoryTranslationDto,
  BlogCategoryFilterParams,
} from "./blogcategories.types";

export const blogCategoryService = {
  /**
   * Get all active blog categories with translations in specified language
   * (Optimized for frontend menus/lists)
   */
  async getAllBlogCategories(languageCode: string = "en") {
    const categories = await prisma.blogCategory.findMany({
      where: { isActive: true },
      include: {
        translations: { where: { languageCode }, take: 1 },
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return categories.map((cat) => ({
      id: cat.id,
      handle: cat.handle,
      isActive: cat.isActive,
      title: cat.translations[0]?.title || "Untitled",
      description: cat.translations[0]?.description || "",
      metaTitle: cat.translations[0]?.metaTitle || null,
      metaDescription: cat.translations[0]?.metaDescription || null,
      postsCount: cat._count.posts,
    }));
  },

  /**
   * Get paginated blog categories (Admin Dashboard)
   */
  async getPaginatedBlogCategories(
    params: {
      page?: number;
      pageSize?: number;
      languageCode?: string;
    } & BlogCategoryFilterParams = {},
  ) {
    const {
      page = 1,
      pageSize = 10,
      languageCode = "en",
      isActive,
      search,
    } = params;

    const skip = (page - 1) * pageSize;

    // Build Where Clause
    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (search) {
      whereClause.OR = [
        { handle: { contains: search, mode: "insensitive" } },
        {
          translations: {
            some: {
              title: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Run queries in parallel
    const [totalItems, categories] = await Promise.all([
      prisma.blogCategory.count({ where: whereClause }),

      prisma.blogCategory.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          translations: {
            where: { languageCode },
            take: 1,
          },
          _count: {
            select: { posts: true },
          },
        },
      }),
    ]);

    return {
      data: categories.map((cat) => ({
        id: cat.id,
        handle: cat.handle,
        isActive: cat.isActive,
        title: cat.translations[0]?.title || "Untitled",
        description: cat.translations[0]?.description || "",
        metaTitle: cat.translations[0]?.metaTitle || null,
        metaDescription: cat.translations[0]?.metaDescription || null,
        postsCount: cat._count.posts,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  },

  /**
   * Get single category by ID with specific language translation
   */
  async getBlogCategoryById(id: number, languageCode?: string) {
    const category = await prisma.blogCategory.findUnique({
      where: { id },
      include: {
        translations: languageCode ? { where: { languageCode } } : true,
        _count: { select: { posts: true } },
      },
    });

    if (!category) {
      throw new AppError("Blog Category not found", StatusCodes.NOT_FOUND);
    }

    return category;
  },

  /**
   * Get category by Handle (Public Route)
   */
  async getBlogCategoryByHandle(handle: string, languageCode: string = "en") {
    const category = await prisma.blogCategory.findUnique({
      where: { handle },
      include: {
        translations: {
          where: { languageCode },
          take: 1,
        },
      },
    });

    if (!category) {
      throw new AppError("Blog Category not found", StatusCodes.NOT_FOUND);
    }

    // Check if category is active (unless you want admins to see inactive via handle)
    if (!category.isActive) {
      // Optional: throw error if you don't want public access to inactive categories
      // throw new AppError("Blog Category is not active", StatusCodes.NOT_FOUND);
    }

    return {
      id: category.id,
      handle: category.handle,
      title: category.translations[0]?.title || "Untitled",
      description: category.translations[0]?.description,
      metaTitle: category.translations[0]?.metaTitle || null,
      metaDescription: category.translations[0]?.metaDescription || null,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  },

  /**
   * Create a new category with translations
   */
  async createBlogCategory(data: CreateBlogCategoryDto) {
    // Check if handle already exists
    const existing = await prisma.blogCategory.findUnique({
      where: { handle: data.handle },
    });

    if (existing) {
      throw new AppError(
        "Blog Category with this handle already exists",
        StatusCodes.CONFLICT,
      );
    }

    // Verify all language codes exist
    const languageCodes = data.translations.map((t) => t.languageCode);
    const languages = await prisma.language.findMany({
      where: {
        code: { in: languageCodes },
        isActive: true,
      },
    });

    if (languages.length !== languageCodes.length) {
      throw new AppError(
        "One or more language codes are invalid or inactive",
        StatusCodes.BAD_REQUEST,
      );
    }

    return prisma.blogCategory.create({
      data: {
        handle: data.handle,
        isActive: data.isActive ?? true,
        translations: {
          create: data.translations,
        },
      },
      include: {
        translations: true,
      },
    });
  },

  /**
   * Update category
   */
  async updateBlogCategory(id: number, data: UpdateBlogCategoryDto) {
    const category = await prisma.blogCategory.findUnique({ where: { id } });

    if (!category) {
      throw new AppError("Blog Category not found", StatusCodes.NOT_FOUND);
    }

    // Check unique handle
    if (data.handle && data.handle !== category.handle) {
      const existing = await prisma.blogCategory.findUnique({
        where: { handle: data.handle },
      });

      if (existing) {
        throw new AppError(
          "Blog Category with this handle already exists",
          StatusCodes.CONFLICT,
        );
      }
    }

    const updateData: any = {};
    if (data.handle !== undefined) updateData.handle = data.handle;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Handle translations upsert
    if (data.translations && data.translations.length > 0) {
      // Validate languages...
      const languageCodes = data.translations.map((t) => t.languageCode);
      const languages = await prisma.language.findMany({
        where: { code: { in: languageCodes }, isActive: true },
      });

      if (languages.length !== languageCodes.length) {
        throw new AppError(
          "Invalid language codes provided",
          StatusCodes.BAD_REQUEST,
        );
      }

      updateData.translations = {
        upsert: data.translations.map((t) => ({
          where: {
            blogCategoryId_languageCode: {
              blogCategoryId: id,
              languageCode: t.languageCode,
            },
          },
          update: {
            title: t.title,
            description: t.description,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
          },
          create: {
            languageCode: t.languageCode,
            title: t.title,
            description: t.description,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
          },
        })),
      };
    }

    return prisma.blogCategory.update({
      where: { id },
      data: updateData,
      include: { translations: true },
    });
  },

  /**
   * Update specific translation
   */
  async updateBlogCategoryTranslation(
    categoryId: number,
    languageCode: string,
    data: UpdateBlogCategoryTranslationDto,
  ) {
    // We rely on the unique constraint `blogCategoryId_languageCode`
    // If it doesn't exist, Prisma throws RecordNotFound, which we can catch or let bubble up
    // But checking explicitly allows cleaner error messages

    const translation = await prisma.blogCategoryTranslation.findUnique({
      where: {
        blogCategoryId_languageCode: {
          blogCategoryId: categoryId,
          languageCode,
        },
      },
    });

    if (!translation) {
      throw new AppError(
        "Translation not found for this language",
        StatusCodes.NOT_FOUND,
      );
    }

    return prisma.blogCategoryTranslation.update({
      where: {
        blogCategoryId_languageCode: {
          blogCategoryId: categoryId,
          languageCode,
        },
      },
      data,
    });
  },

  /**
   * Delete category
   */
  async deleteBlogCategory(id: number) {
    const category = await prisma.blogCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      throw new AppError("Blog Category not found", StatusCodes.NOT_FOUND);
    }

    // Protect against deleting categories that are in use
    if (category._count.posts > 0) {
      throw new AppError(
        "Cannot delete category that has blog posts attached. Please reassign or delete the posts first.",
        StatusCodes.BAD_REQUEST,
      );
    }

    await prisma.blogCategory.delete({ where: { id } });
  },
};
