import { Router } from "express";
import multer from "multer";
import { blogPostController } from "./blogposts.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import { blogPostValidation } from "./blogposts.validation";

const router = Router();

// Configure Multer (Memory storage for processing in service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// --------------------
// PUBLIC ROUTES
// --------------------

router.get("/", blogPostController.getAllPosts);

router.get("/category", blogPostController.getPostsByCategory);

router.get(
  "/handle/:handle",
  validate(blogPostValidation.handleParams),
  blogPostController.getPostByHandle,
);

// --------------------
// ADMIN ROUTES
// --------------------

router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  validate(blogPostValidation.params),
  blogPostController.getPostById,
);

router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("image"), // Expects form-data key "image"
  validate(blogPostValidation.create),
  blogPostController.createPost,
);

router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("image"),
  validate(blogPostValidation.params),
  validate(blogPostValidation.update),
  blogPostController.updatePost,
);

router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  validate(blogPostValidation.params),
  blogPostController.deletePost,
);

export default router;
