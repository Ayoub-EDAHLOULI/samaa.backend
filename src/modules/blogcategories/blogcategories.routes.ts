import { Router } from "express";
import { blogCategoryController } from "./blogcategories.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import { blogCategoryValidation } from "./blogcategories.validation";

const router = Router();

// --------------------
// ADMIN ROUTES (Dashboard)
// --------------------

// Get paginated list for admin dashboard
router.get(
  "/paginated",
  authenticate,
  authorize(["ADMIN"]),
  blogCategoryController.getPaginatedBlogCategories,
);

// Create a new blog category
router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  validate(blogCategoryValidation.create),
  blogCategoryController.createBlogCategory,
);

// Update a blog category (Handle, Active status, and multiple translations)
router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  validate(blogCategoryValidation.params),
  validate(blogCategoryValidation.update),
  blogCategoryController.updateBlogCategory,
);

// Update a specific translation for a category
router.put(
  "/:id/translations/:languageCode",
  authenticate,
  authorize(["ADMIN"]),
  validate(blogCategoryValidation.translationParams),
  validate(blogCategoryValidation.updateTranslation),
  blogCategoryController.updateBlogCategoryTranslation,
);

// Delete a blog category
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  validate(blogCategoryValidation.params),
  blogCategoryController.deleteBlogCategory,
);

// --------------------
// PUBLIC ROUTES
// --------------------

// Get all active categories (for frontend menus/lists)
router.get("/", blogCategoryController.getAllBlogCategories);

// Get category by handle (SEO friendly URL)
router.get(
  "/handle/:handle",
  validate(blogCategoryValidation.handleParams),
  blogCategoryController.getBlogCategoryByHandle,
);

// Get category by ID
router.get(
  "/:id",
  validate(blogCategoryValidation.params),
  blogCategoryController.getBlogCategoryById,
);

export default router;
