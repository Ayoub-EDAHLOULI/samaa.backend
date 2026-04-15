import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  BlogPostFilterParams,
} from "./blogposts.types";

export const blogPostService = {
  /**
   * Helper: Save image file and return URL
   */
  async saveImageFile(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    if (!allowedExt.includes(ext)) {
      throw new AppError("Unsupported image format", StatusCodes.BAD_REQUEST);
    }

    const fileName = `${nanoid(12)}${ext}`;
    const uploadPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "blog",
      fileName,
    );

    // Ensure directory exists
    const dir = path.dirname(uploadPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(uploadPath, file.buffer);
    return `/uploads/blog/${fileName}`;
  },

  /**
   * Get Paginated Blog Posts (Public & Admin)
   */
  async getPaginatedPosts(params: BlogPostFilterParams) {
    const {
      page = 1,
      pageSize = 12,
      languageCode = "en",
      search,
      categoryId,
      authorId,
      isPublished, // "true" | "false"
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * pageSize;

    // 1. Build Base Where Clause
    const where: any = {};

    if (categoryId) where.categoryId = categoryId;
    if (authorId) where.authorId = authorId;

    if (isPublished !== undefined) {
      where.isPublished = isPublished === "true";
    }

    // 2. Add Search Logic (Handle, Title, Content, Author, Category)
    if (search) {
      where.OR = [
        // Search by Handle
        { handle: { contains: search, mode: "insensitive" } },

        // Search by Title or Content (in specific language)
        {
          translations: {
            some: {
              languageCode, // Restrict search to current language? Remove this line if you want to search all languages
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },

        // Search by Author Name
        {
          author: {
            name: { contains: search, mode: "insensitive" },
          },
        },

        // Search by Category Title
        {
          category: {
            translations: {
              some: {
                title: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    // 3. Build Order By
    let orderBy: any = {};
    if (sortBy === "title") {
      // Sort by translated title
      // Note: This is complex in Prisma. Often simpler to just sort by createdAt or handle
      // For now, we fallback to createdAt if title sort is requested, or basic relation sort
      orderBy = { createdAt: sortOrder };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // 4. Execute Queries
    const [totalItems, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          author: {
            select: { id: true, name: true },
          },
          category: {
            include: {
              translations: { where: { languageCode }, take: 1 },
            },
          },
          translations: {
            where: { languageCode },
            take: 1,
          },
        },
      }),
    ]);

    return {
      data: posts.map((post) => ({
        id: post.id,
        handle: post.handle,
        imageUrl: post.imageUrl,
        isPublished: post.isPublished,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,

        title: post.translations[0]?.title || "Untitled",
        excerpt: post.translations[0]?.excerpt || "",

        author: post.author.name,
        authorId: post.author.id,

        readTimeMinutes: post.readTimeMinutes,
        viewCount: post.viewCount,
        metaTitle: post.translations[0]?.metaTitle || null,
        metaDescription: post.translations[0]?.metaDescription || null,
        tags: post.translations[0]?.tags || null,

        category: {
          id: post.category.id,
          handle: post.category.handle,
          title: post.category.translations[0]?.title || "Untitled",
        },
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
   * Get Paginated Blog Posts (Public & Admin)
   * Updated to support filtering by categoryId OR categoryHandle
   */
  async getPaginatedPostsByCategory(
    params: BlogPostFilterParams & { categoryHandle?: string },
  ) {
    const {
      page = 1,
      pageSize = 12,
      languageCode = "en",
      search,
      categoryId,
      categoryHandle, // <--- New Parameter
      authorId,
      isPublished,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * pageSize;

    // --- 1. Resolve Category ID (Handle vs ID) ---
    let finalCategoryId = categoryId;

    // If no ID provided but Handle is, look up the ID
    if (!finalCategoryId && categoryHandle) {
      const category = await prisma.blogCategory.findUnique({
        where: { handle: categoryHandle },
        select: { id: true },
      });

      if (category) {
        finalCategoryId = category.id;
      } else {
        // Edge Case: User asked for a category handle that doesn't exist.
        // Return empty result immediately to avoid unnecessary query.
        return {
          data: [],
          meta: {
            page,
            pageSize,
            totalItems: 0,
            totalPages: 0,
          },
        };
      }
    }

    // --- 2. Build Where Clause ---
    const where: any = {};

    if (finalCategoryId) where.categoryId = finalCategoryId; // Use resolved ID
    if (authorId) where.authorId = authorId;

    if (isPublished !== undefined) {
      where.isPublished = isPublished === "true";
    }

    if (search) {
      where.translations = {
        some: {
          languageCode,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        },
      };
    }

    // --- 3. Build Order By ---
    let orderBy: any = {};
    if (sortBy === "title") {
      orderBy = { translations: { _count: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // --- 4. Execute Query ---
    const [totalItems, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          author: {
            select: { id: true, name: true },
          },
          category: {
            include: {
              translations: { where: { languageCode }, take: 1 },
            },
          },
          translations: {
            where: { languageCode },
            take: 1,
          },
        },
      }),
    ]);

    // --- 5. Map & Return ---
    return {
      data: posts.map((post) => ({
        id: post.id,
        handle: post.handle,
        imageUrl: post.imageUrl,
        isPublished: post.isPublished,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,

        title: post.translations[0]?.title || "Untitled",
        excerpt: post.translations[0]?.excerpt || "",

        author: post.author.name,
        authorId: post.author.id,

        readTimeMinutes: post.readTimeMinutes,
        viewCount: post.viewCount,
        metaTitle: post.translations[0]?.metaTitle || null,
        metaDescription: post.translations[0]?.metaDescription || null,
        tags: post.translations[0]?.tags || null,

        category: {
          id: post.category.id,
          handle: post.category.handle,
          title: post.category.translations[0]?.title || "Untitled",
        },
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
   * Get Single Post by Handle
   */
  async getPostByHandle(handle: string, languageCode: string = "en") {
    const post = await prisma.blogPost.findUnique({
      where: { handle },
      include: {
        author: { select: { id: true, name: true } },
        category: {
          include: { translations: { where: { languageCode }, take: 1 } },
        },
        translations: { where: { languageCode }, take: 1 },
      },
    });

    if (!post) {
      throw new AppError("Blog post not found", StatusCodes.NOT_FOUND);
    }

    // If needed, check isPublished here unless it's an admin route preview

    return {
      id: post.id,
      handle: post.handle,
      imageUrl: post.imageUrl,
      isPublished: post.isPublished,
      publishedAt: post.publishedAt,
      title: post.translations[0]?.title || "Untitled",
      content: post.translations[0]?.content || "",
      excerpt: post.translations[0]?.excerpt || "",
      author: post.author,
      authorId: post.author.id,

      readTimeMinutes: post.readTimeMinutes,
      viewCount: post.viewCount,
      metaTitle: post.translations[0]?.metaTitle || null,
      metaDescription: post.translations[0]?.metaDescription || null,
      tags: post.translations[0]?.tags || null,

      category: {
        id: post.category.id,
        handle: post.category.handle,
        title: post.category.translations[0]?.title || "Untitled",
      },
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  },

  /**
   * Get Single Post by ID (Admin)
   */
  async getPostById(id: number, languageCode: string = "en") {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        translations: true, // Return all translations for admin editing
        category: true,
      },
    });

    if (!post) {
      throw new AppError("Blog post not found", StatusCodes.NOT_FOUND);
    }
    return post;
  },

  /**
   * Create Blog Post
   */
  async createPost(data: CreateBlogPostDto, file?: Express.Multer.File) {
    // 1. Check Handle
    const existing = await prisma.blogPost.findUnique({
      where: { handle: data.handle },
    });
    if (existing) {
      throw new AppError("Handle already exists", StatusCodes.CONFLICT);
    }

    // --- PARSING SECTION ---

    // A. Parse Category ID
    const categoryId = Number(data.categoryId);
    if (isNaN(categoryId) || categoryId <= 0) {
      throw new AppError("Invalid category ID", StatusCodes.BAD_REQUEST);
    }

    // C. Parse Author ID (ADD THIS BLOCK) ++++++++++++++++++++++
    const authorId = String(data.authorId);
    if (!authorId || authorId === "undefined") {
      throw new AppError("Invalid Author ID", StatusCodes.BAD_REQUEST);
    }

    // B. Parse isPublished (Multer sends "true"/"false" strings)
    const isPublished = String(data.isPublished) === "true";

    // C. Parse Translations (Multer sends JSON string)
    let translations: any[] = [];
    if (typeof data.translations === "string") {
      try {
        translations = JSON.parse(data.translations);
      } catch (error) {
        throw new AppError(
          "Invalid translations JSON",
          StatusCodes.BAD_REQUEST,
        );
      }
    } else if (Array.isArray(data.translations)) {
      translations = data.translations;
    }

    // -----------------------

    // 2. Check Category
    const category = await prisma.blogCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new AppError("Blog Category not found", StatusCodes.BAD_REQUEST);
    }

    // 3. Handle Image
    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await this.saveImageFile(file);
    }

    // 4. Validate Languages
    if (translations.length > 0) {
      const codes = translations.map((t: any) => t.languageCode);
      const langs = await prisma.language.findMany({
        where: { code: { in: codes }, isActive: true },
      });
      if (langs.length !== codes.length) {
        throw new AppError("Invalid language codes", StatusCodes.BAD_REQUEST);
      }
    }

    // Resolve publishedAt: use provided value, or auto-set to now when publishing
    const publishedAt = data.publishedAt
      ? new Date(data.publishedAt)
      : isPublished
        ? new Date()
        : null;

    // 5. Create
    return prisma.blogPost.create({
      data: {
        handle: data.handle,
        categoryId: categoryId,
        authorId: authorId,
        imageUrl: imageUrl,
        isPublished: isPublished,
        publishedAt,
        readTimeMinutes: data.readTimeMinutes,
        translations: {
          create: translations,
        },
      },
      include: {
        translations: true,
      },
    });
  },

  /**
   * Update Blog Post
   */
  async updatePost(
    id: number,
    data: UpdateBlogPostDto,
    file?: Express.Multer.File,
  ) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new AppError("Post not found", StatusCodes.NOT_FOUND);

    // Check Handle
    if (data.handle && data.handle !== post.handle) {
      const existing = await prisma.blogPost.findUnique({
        where: { handle: data.handle },
      });
      if (existing) throw new AppError("Handle exists", StatusCodes.CONFLICT);
    }

    // --- PARSING SECTION (Multer sends strings via form-data) ---

    // A. Parse Category ID
    let categoryId: number | undefined;
    if (data.categoryId) {
      categoryId = Number(data.categoryId);
      if (isNaN(categoryId) || categoryId <= 0) {
        throw new AppError("Invalid category ID", StatusCodes.BAD_REQUEST);
      }
    }

    // B. Parse isPublished (Multer sends "true"/"false" strings)
    let isPublished: boolean | undefined;
    if (data.isPublished !== undefined) {
      isPublished = String(data.isPublished) === "true";
    }

    // C. Parse Translations (Multer sends JSON string)
    let translations: any[] = [];
    if (data.translations) {
      if (typeof data.translations === "string") {
        try {
          translations = JSON.parse(data.translations);
        } catch (error) {
          throw new AppError(
            "Invalid translations JSON",
            StatusCodes.BAD_REQUEST,
          );
        }
      } else if (Array.isArray(data.translations)) {
        translations = data.translations;
      }
    }

    // -----------------------

    // Prepare Update Data
    const updateData: any = {};
    if (data.handle) updateData.handle = data.handle;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (data.publishedAt) {
      updateData.publishedAt = new Date(data.publishedAt);
    } else if (isPublished === true && !post.publishedAt) {
      // Switching to published with no existing publishedAt — auto-set to now
      updateData.publishedAt = new Date();
    }

    // Handle Image Update
    if (file) {
      updateData.imageUrl = await this.saveImageFile(file);
    }

    // Handle Translations
    if (translations.length > 0) {
      // Validate language codes
      const codes = translations.map((t: any) => t.languageCode);
      const langs = await prisma.language.findMany({
        where: { code: { in: codes }, isActive: true },
      });
      if (langs.length !== codes.length) {
        const foundCodes = langs.map((l) => l.code);
        const missingCodes = codes.filter(
          (code: string) => !foundCodes.includes(code),
        );
        throw new AppError(
          `Invalid or inactive language codes: ${missingCodes.join(", ")}`,
          StatusCodes.BAD_REQUEST,
        );
      }

      updateData.translations = {
        upsert: translations.map((t: any) => ({
          where: {
            blogPostId_languageCode: {
              blogPostId: id,
              languageCode: t.languageCode,
            },
          },
          update: {
            title: t.title,
            content: t.content,
            excerpt: t.excerpt,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
            tags: t.tags,
          },
          create: {
            languageCode: t.languageCode,
            title: t.title,
            content: t.content,
            excerpt: t.excerpt,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
            tags: t.tags,
          },
        })),
      };
    }

    return prisma.blogPost.update({
      where: { id },
      data: updateData,
      include: { translations: true },
    });
  },

  /**
   * Delete Post
   */
  async deletePost(id: number) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new AppError("Post not found", StatusCodes.NOT_FOUND);

    // Optional: Delete image file from FS here

    await prisma.blogPost.delete({ where: { id } });
  },
};
