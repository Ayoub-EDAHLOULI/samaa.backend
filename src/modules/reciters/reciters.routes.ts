import { Router } from "express";
import { Role } from "@prisma/client";
import { reciterController } from "./reciters.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  authorize,
  optionalAuth,
} from "../../shared/middleware/auth.middleware";
import { uploadImage } from "../../shared/middleware/multer";
import { reciterValidation } from "./reciters.validation";

const router = Router();

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

// GET /reciters — paginated list with optional search
router.get("/", reciterController.getAllReciters);

// GET /reciters/trending — top reciters by total discoveries
// IMPORTANT: must be registered BEFORE /:slug to avoid "trending" being treated as a slug
router.get("/trending", reciterController.getTrendingReciters);

// GET /reciters/id/:id — fetch by UUID (Admin edit forms)
// IMPORTANT: must be before /:slug
router.get(
  "/id/:id",
  authenticate,
  authorize([Role.ADMIN]),
  validate(reciterValidation.idParam),
  reciterController.getReciterById,
);

// GET /reciters/:slug — full reciter detail
// optionalAuth attaches req.user if a valid token is present so isFavorited is populated
router.get("/:slug", optionalAuth, reciterController.getReciterBySlug);

// ---------------------------------------------------------------------------
// Authenticated routes
// ---------------------------------------------------------------------------

// POST /reciters/:id/favorite — toggle favorite (requires login)
router.post(
  "/:id/favorite",
  authenticate,
  validate(reciterValidation.idParam),
  reciterController.toggleFavorite,
);

// ---------------------------------------------------------------------------
// Admin-only routes
// ---------------------------------------------------------------------------

router.post(
  "/",
  authenticate,
  authorize([Role.ADMIN]),
  uploadImage.single("image"),
  validate(reciterValidation.create),
  reciterController.createReciter,
);

router.put(
  "/:id",
  authenticate,
  authorize([Role.ADMIN]),
  uploadImage.single("image"),
  validate(reciterValidation.idParam),
  validate(reciterValidation.update),
  reciterController.updateReciter,
);

router.delete(
  "/:id",
  authenticate,
  authorize([Role.ADMIN]),
  validate(reciterValidation.idParam),
  reciterController.deleteReciter,
);

export default router;
